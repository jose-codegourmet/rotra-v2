// Captures what the Admin GET reads put on the wire, by running the real Admin Route Handlers (apps/admin/src/app/api)
// and the real @rotra/db services (Prisma) against a throwaway local Postgres:
//   GET /api/clubs  /clubs/{clubId}  /clubs/identity  /players  /players/{playerId}  /players/{playerId}/games
//   /players/{playerId}/verification  /sales  /sales/clubs/{clubId}  /audit-events  /contact-change-requests (+ one)
//   /password-reset-requests  /feature-flags  /ranking-settings  /license-operations/{commandId}
//   /profile-banners  /profile-characters
//
//   docker run -d --rm --name rotra-capture-pg -e POSTGRES_PASSWORD=test -p 127.0.0.1:55439:5432 postgres:16-alpine
//   source ~/.nvm/nvm.sh && nvm use
//   ROTRA_CAPTURE_DB_URL=postgres://postgres:test@127.0.0.1:55439/postgres \
//     node node_modules/.pnpm/vitest@*/node_modules/vitest/vitest.mjs run --config apps/api/testdata/tools/vitest.capture.config.mjs apps/api/testdata/tools/capture-signedin-admin.test.mjs
//
// Refuses any host but 127.0.0.1/localhost. It creates its own database (rotra_capture_<n>) and drops it.
// Output: apps/api/internal/signedin/testdata/admin.golden.json (commit it).
//
// Only the Supabase session check is replaced: verifySubject answers the case's subject (a case with none is signed
// out), so loadAccountContext (the active-admin check) and every service run for real. The seed file is also the
// reset: a case with a scenario, and the case after it, reload it first. The clock is fixed per case (Date only); the
// Go test passes the same instant through Deps.Now. A case that answers 500 fails the capture, so the malformed IDs the
// TypeScript crashes on (a Prisma uuid error) are not captured; the Go test pins what Go answers instead.
import { createRequire } from 'node:module'
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, expect, test, vi } from 'vitest'

vi.mock('../../../../packages/db/src/auth/supabase.ts', async (importOriginal) => ({
  ...(await importOriginal()),
  verifySubject: async () =>
    globalThis.__rotraSubject ? { provider: 'supabase', subject: globalThis.__rotraSubject } : null,
}))

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '../../../..')
const pkgDb = resolve(root, 'packages/db')
const testdata = resolve(here, '../../internal/signedin/testdata')
const apiDir = resolve(root, 'apps/admin/src/app/api')
const require = createRequire(`${pkgDb}/package.json`)
const { Client } = require('pg')

const adminUrl = process.env.ROTRA_CAPTURE_DB_URL
if (!adminUrl) throw new Error('Set ROTRA_CAPTURE_DB_URL (a local throwaway Postgres).')
const host = new URL(adminUrl).hostname
if (!['127.0.0.1', 'localhost', '::1', '[::1]'].includes(host)) throw new Error(`Refusing non-local host ${host}`)

const cases = JSON.parse(readFileSync(`${testdata}/admin.cases.json`, 'utf8'))
const seed = readFileSync(`${testdata}/admin.seed.sql`, 'utf8')
const dbName = `rotra_capture_${Date.now()}`
const dbUrl = (() => {
  const u = new URL(adminUrl)
  u.pathname = `/${dbName}`
  return u.toString()
})()

let admin
let db

beforeAll(async () => {
  admin = new Client({ connectionString: adminUrl })
  await admin.connect()
  await admin.query(`CREATE DATABASE ${dbName}`)
  db = new Client({ connectionString: dbUrl })
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
})

afterAll(async () => {
  vi.useRealTimers()
  const { prisma } = await import('../../../../packages/db/src/client/prisma.ts')
  await prisma.$disconnect()
  await db?.end()
  await admin?.query(`DROP DATABASE IF EXISTS ${dbName} WITH (FORCE)`)
  await admin?.end()
})

// What Next does for a path: static segments win over a dynamic one; a dynamic segment is the percent-decoded value.
async function dispatch(c) {
  const url = new URL(c.path, 'http://localhost:9002')
  let dir = apiDir
  const params = {}
  for (const raw of url.pathname.split('/').slice(2)) {
    const seg = decodeURIComponent(raw)
    if (existsSync(`${dir}/${seg}`)) dir = `${dir}/${seg}`
    else {
      const dyn = readdirSync(dir).find((n) => /^\[.+\]$/.test(n))
      if (!dyn) throw new Error(`no route for ${c.path}`)
      params[dyn.slice(1, -1)] = seg
      dir = `${dir}/${dyn}`
    }
  }
  const route = await import(`${dir}/route.ts`)
  return route.GET(new Request(url), { params: Promise.resolve(params) })
}

test('capture', async () => {
  expect(new Set(cases.cases.map((c) => c.name)).size).toBe(cases.cases.length)
  const golden = {}
  let dirty = true
  for (const c of cases.cases) {
    if (dirty || c.scenario !== 'base') {
      await db.query(seed)
      for (const stmt of cases.scenarios[c.scenario]) {
        await db.query('SET session_replication_role = replica')
        await db.query(stmt)
        await db.query('SET session_replication_role = DEFAULT')
      }
    }
    dirty = c.scenario !== 'base'
    // Date only: Prisma and the pg driver keep their timers.
    vi.useFakeTimers({ toFake: ['Date'], now: new Date(c.now ?? cases.now) })
    globalThis.__rotraSubject = c.who
    const res = await dispatch(c)
    vi.useRealTimers()
    const text = await res.text()
    let body
    try {
      body = JSON.parse(text)
    } catch {
      body = { __raw: text }
    }
    expect(res.status, c.name).not.toBe(500)
    golden[c.name] = { status: res.status, headers: Object.fromEntries([...res.headers.entries()].sort()), body }
  }
  writeFileSync(`${testdata}/admin.golden.json`, `${JSON.stringify(golden, null, 2)}\n`)
  expect(Object.keys(golden).length).toBe(cases.cases.length)
})
