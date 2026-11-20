// The TypeScript side of the write harness (the Go side is apps/api/internal/writetest, see its doc.go).
//
// A capture script (capture-writes-<group>.test.mjs) is a few lines: it mocks verifySubject, opens a throwaway
// database and calls captureWrites with its cases file. For every case this module
//   1. reloads the seed file and the scenario's statements (so no case sees what an earlier one wrote),
//   2. fixes the clock (Date only: Prisma and the pg driver keep their timers) and sets the signed-in subject,
//   3. runs each step through the REAL Route Handler (`apps/<app>/src/app/api/**/route.ts`) and the real
//      @rotra/db service on the real Postgres; a "parallel" step runs its requests with Promise.all,
//   4. reads the snapshot SQL of the cases file back (time zone UTC) and redacts the named generated values,
// and writes `<name>.golden.json` next to the cases file. Nothing is written by hand.
//
// A step that answers 500 fails the capture unless it says "allow500" (a crash of the TypeScript that Go answers
// differently on purpose, with "goExpects"). Only Date is faked, so a value Prisma stamps with the client clock
// (@updatedAt) is pinned, while a column default (now()) is the database's real time and is redacted by name.
import { AsyncLocalStorage } from 'node:async_hooks'
import { createRequire } from 'node:module'
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, vi } from 'vitest'
import { jar, resetJar } from './next-headers-stub.mjs'

const here = dirname(fileURLToPath(import.meta.url))
export const root = resolve(here, '../../../..')
const pkgDb = resolve(root, 'packages/db')
const require = createRequire(`${pkgDb}/package.json`)
const { Client } = require('pg')

export const REDACTED = '<redacted>'

// The signed-in subject of a request. It rides on async context, not a global, so the requests of a parallel step
// can be signed in as different admins at the same time.
const subjects = new AsyncLocalStorage()
/** What the mocked verifySubject answers: the subject of the step being run, or null (signed out). */
export const currentSubject = () => subjects.getStore() ?? null

/** Creates a throwaway database from ROTRA_CAPTURE_DB_URL (local hosts only) with the Prisma migrations applied. */
export async function openCaptureDb() {
  const adminUrl = process.env.ROTRA_CAPTURE_DB_URL
  if (!adminUrl) throw new Error('Set ROTRA_CAPTURE_DB_URL (a local throwaway Postgres).')
  const host = new URL(adminUrl).hostname
  if (!['127.0.0.1', 'localhost', '::1', '[::1]'].includes(host)) throw new Error(`Refusing non-local host ${host}`)
  const dbName = `rotra_capture_${Date.now()}`
  const dbUrl = (() => {
    const u = new URL(adminUrl)
    u.pathname = `/${dbName}`
    return u.toString()
  })()
  const admin = new Client({ connectionString: adminUrl })
  await admin.connect()
  await admin.query(`CREATE DATABASE ${dbName}`)
  const db = new Client({ connectionString: dbUrl })
  await db.connect()
  for (const role of ['anon', 'authenticated', 'service_role']) {
    await admin.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${role}') THEN CREATE ROLE ${role} NOLOGIN; END IF; END $$`)
  }
  const dir = `${pkgDb}/prisma/migrations`
  for (const name of readdirSync(dir).filter((n) => /^\d/.test(n)).sort()) {
    await db.query(readFileSync(`${dir}/${name}/migration.sql`, 'utf8'))
  }
  process.env.DATABASE_URL = dbUrl
  process.env.ROTRA_DATA_MODE = 'real'
  return {
    db,
    async close() {
      vi.useRealTimers()
      const { prisma } = await import('../../../../packages/db/src/client/prisma.ts')
      await prisma.$disconnect()
      await db.end()
      await admin.query(`DROP DATABASE IF EXISTS ${dbName} WITH (FORCE)`)
      await admin.end()
    },
  }
}

/** What Next does for a path: static segments win over a dynamic one; a dynamic segment is percent-decoded. */
function resolveRoute(apiDir, path) {
  const url = new URL(path, process.env.ROTRA_CAPTURE_ORIGIN ?? 'http://localhost:9002')
  let dir = apiDir
  const params = {}
  for (const raw of url.pathname.split('/').slice(2)) {
    const seg = decodeURIComponent(raw)
    if (existsSync(`${dir}/${seg}`)) dir = `${dir}/${seg}`
    else {
      const dyn = readdirSync(dir).find((n) => /^\[.+\]$/.test(n))
      if (!dyn) throw new Error(`no route for ${path}`)
      params[dyn.slice(1, -1)] = seg
      dir = `${dir}/${dyn}`
    }
  }
  return { url, dir, params }
}

async function send(apiDir, step) {
  resetJar(step.cookie)
  const { url, dir, params } = resolveRoute(apiDir, step.path)
  const route = await import(`${dir}/route.ts`)
  const handler = route[step.method]
  if (!handler) throw new Error(`${dir}/route.ts has no ${step.method}`)
  const init = { method: step.method }
  if (step.rawBody !== undefined && step.rawBody !== null) init.body = step.rawBody
  else if (step.body !== undefined && step.body !== null) init.body = JSON.stringify(step.body)
  const headers = init.body !== undefined ? { 'content-type': 'application/json' } : {}
  // Step.headers: sent as given; "" leaves a default header out.
  for (const [name, value] of Object.entries(step.headers ?? {})) {
    if (value === '') delete headers[name.toLowerCase()]
    else headers[name.toLowerCase()] = value
  }
  init.headers = headers
  return handler(new Request(url, init), { params: Promise.resolve(params) })
}

async function answer(apiDir, step, subject, label, { redact = step.redact ?? [], optional = step.redactOptional ?? false } = {}) {
  const res = await subjects.run(subject ?? null, () => send(apiDir, step))
  const text = await res.text()
  let body
  try {
    body = JSON.parse(text)
  } catch {
    body = { __raw: text }
  }
  let hits = []
  if (!step.allow500) expect(res.status, label).not.toBe(500)
  try {
    hits = redactPaths(body, redact, optional)
  } catch (error) {
    throw new Error(`${label}: ${error.message} (status ${res.status}, body ${text.slice(0, 200)})`)
  }
  const saved = savePaths(body, step.save ?? {}, label)
  sortUnordered(body, step.unordered ?? [])
  const ignored = (step.ignoreHeaders ?? []).map((h) => h.toLowerCase())
  const headers = Object.fromEntries([...res.headers.entries()].filter(([k]) => !ignored.includes(k.toLowerCase())).sort())
  // A cookie a handler set through next/headers (the visitor routes): Next writes it to the response as Set-Cookie.
  const setCookies = jar.response.getSetCookie()
  if (setCookies.length) headers['set-cookie'] = setCookies.join(', ')
  return { status: res.status, headers, body, hits, saved }
}

/** Step.unordered: dotted paths of arrays whose order is not decided; each is sorted by its elements' canonical JSON (the same as writetest.SortUnordered). */
function sortUnordered(body, paths) {
  for (const path of paths) {
    let node = body
    for (const seg of path.split('.')) node = node == null ? undefined : node[seg]
    if (node == null) continue // an error answer has no such list
    if (!Array.isArray(node)) throw new Error(`unordered "${path}": not an array`)
    node.sort((a, b) => (canonical(a) < canonical(b) ? -1 : canonical(a) > canonical(b) ? 1 : 0))
  }
}

/** Step.save: name -> dotted path in the answer (a number segment is an array index), read before anything is redacted. */
function savePaths(body, save, label) {
  const out = {}
  for (const [name, path] of Object.entries(save)) {
    let node = body
    for (const seg of path.split('.')) node = node == null ? undefined : node[seg]
    if (typeof node !== 'string' && typeof node !== 'number') throw new Error(`${label}: save "${name}": no text or number at "${path}"`)
    out[name] = String(node)
  }
  return out
}

/** Step.save: writes the saved values into a step's path and bodies; a name that was not saved is an error. */
function substituteStep(step, vars, label) {
  const text = JSON.stringify(step).replace(/\{\{(\w+)\}\}/g, (_, name) => {
    if (!(name in vars)) throw new Error(`${label}: {{${name}}} was not saved by an earlier step`)
    return vars[name]
  })
  return JSON.parse(text)
}

/** The same rules as writetest.RedactPaths: dotted path, "*" for array elements, a path with no value is an error. */
export function redactPaths(value, paths, optional = false) {
  const hit = []
  for (const path of paths) {
    const n = redactAt(value, path.split('.'))
    if (n === 0 && !optional) throw new Error(`redacting "${path}": no value there`)
    hit.push(n)
  }
  return hit
}

function redactAt(node, [head, ...rest]) {
  if (Array.isArray(node)) {
    if (head !== '*') throw new Error(`segment "${head}" is applied to an array: use *`)
    let total = 0
    node.forEach((el, i) => {
      if (rest.length === 0) {
        if (el !== null) {
          node[i] = REDACTED
          total++
        }
      } else total += redactAt(el, rest)
    })
    return total
  }
  if (node && typeof node === 'object') {
    const child = node[head]
    if (child === undefined || child === null) return 0
    if (rest.length === 0) {
      node[head] = REDACTED
      return 1
    }
    return redactAt(child, rest)
  }
  return 0
}

/** JSON with sorted keys: equal documents print equal (the order of parallel answers must not matter). */
export function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`
  }
  return JSON.stringify(value)
}

async function snapshot(db, specs, extra = {}) {
  for (const name of Object.keys(extra)) if (!specs.some((s) => s.name === name)) throw new Error(`case redacts the unknown snapshot "${name}"`)
  await db.query(`SET TIME ZONE 'UTC'`)
  const out = {}
  for (const spec of specs) {
    const { rows } = await db.query(`SELECT to_jsonb(t)::text AS row FROM (${spec.sql}) t`)
    const list = rows.map((r) => JSON.parse(r.row))
    for (const column of [...(spec.redact ?? []), ...(extra[spec.name] ?? [])]) {
      for (const row of list) {
        if (!(column in row)) throw new Error(`snapshot ${spec.name}: column "${column}" is not in the row`)
        if (row[column] !== null) row[column] = REDACTED
      }
    }
    out[spec.name] = list
  }
  return out
}

/** SnapshotDiff: the rows that are new or differ from the base, and under "<name> (removed)" the rows that went away. */
function diffSnapshots(now, base) {
  if (!base) return now
  const out = {}
  for (const name of Object.keys(now)) {
    const was = new Set(base[name].map(canonical))
    const is = new Set(now[name].map(canonical))
    out[name] = now[name].filter((r) => !was.has(canonical(r)))
    out[`${name} (removed)`] = base[name].filter((r) => !is.has(canonical(r)))
  }
  return out
}

/**
 * Runs every case of `<testdata>/<name>.cases.json` and writes `<testdata>/<name>.golden.json`.
 * `apiDir` is the app's `src/app/api` folder (the Route Handlers). `beforeCase(case)` runs after the reseed, before the
 * steps: a mock that keeps state resets it there.
 */
export async function captureWrites({ db, testdata, name, apiDir, beforeCase }) {
  const cf = JSON.parse(readFileSync(`${testdata}/${name}.cases.json`, 'utf8'))
  const seed = readFileSync(`${testdata}/${cf.seed}`, 'utf8')
  expect(new Set(cf.cases.map((c) => c.name)).size).toBe(cf.cases.length)
  expect(cf.scenarios.base).toBeDefined()
  const golden = {}
  for (const c of cf.cases) {
    await db.query(seed)
    expect(cf.scenarios[c.scenario], `scenario ${c.scenario}`).toBeDefined()
    for (const stmt of cf.scenarios[c.scenario]) {
      await db.query('SET session_replication_role = replica')
      await db.query(stmt)
      await db.query('SET session_replication_role = DEFAULT')
    }
    if (beforeCase) await beforeCase(c)
    const base = cf.snapshotDiff ? await snapshot(db, cf.snapshot, c.redact) : null
    const read = async () => diffSnapshots(await snapshot(db, cf.snapshot, c.redact), base)
    vi.useFakeTimers({ toFake: ['Date'], now: new Date(c.now ?? cf.now) })
    const steps = []
    const vars = {}
    for (const raw of c.steps) {
      const label = `${c.name} step ${steps.length + 1}`
      const step = substituteStep(raw, vars, label)
      if (step.now) vi.setSystemTime(new Date(step.now))
      if (step.parallel?.length) {
        // The step's redact applies to every answer that has the path; each path must match in at least one.
        const redact = step.redact ?? []
        const all = await Promise.all(
          step.parallel.map((p, i) => answer(apiDir, p, p.who, `${c.name} parallel ${i + 1}`, { redact, optional: true })),
        )
        redact.forEach((path, k) => {
          if (!all.some((a) => a.hits[k] > 0)) throw new Error(`${c.name}: redacting "${path}": no answer has a value there`)
        })
        const sorted = all.map(({ hits, saved, ...rest }) => rest)
        sorted.sort((a, b) => a.status - b.status || canonical(a.body).localeCompare(canonical(b.body)))
        steps.push({ parallel: sorted, ...(step.snapshot ? { db: await read() } : {}) })
      } else {
        const { hits, saved, ...one } = await answer(apiDir, step, step.who, label)
        Object.assign(vars, saved)
        steps.push({ ...one, ...(step.snapshot ? { db: await read() } : {}) })
      }
    }
    vi.useRealTimers()
    golden[c.name] = { steps, db: await read() }
  }
  writeFileSync(`${testdata}/${name}.golden.json`, `${JSON.stringify(golden, null, 2)}\n`)
  expect(Object.keys(golden).length).toBe(cf.cases.length)
}
