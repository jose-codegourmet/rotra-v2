// Captures what the public player page reads put on the wire, by running the real Player Route Handlers and
// the real @rotra/db services (Prisma) against a throwaway local Postgres:
//   GET /api/players/{playerId}  /rank  /games  /clubs     GET /api/rtr-ids/{rtrId}
//
//   docker run -d --rm --name rotra-capture-pg -e POSTGRES_PASSWORD=test -p 127.0.0.1:55439:5432 postgres:16-alpine
//   source ~/.nvm/nvm.sh && nvm use
//   ROTRA_CAPTURE_DB_URL=postgres://postgres:test@127.0.0.1:55439/postgres \
//     node node_modules/.pnpm/vitest@*/node_modules/vitest/vitest.mjs run --config apps/api/testdata/tools/vitest.capture.config.mjs apps/api/testdata/tools/capture-playerpages.test.mjs
//
// Refuses any host but 127.0.0.1/localhost. It creates its own database (rotra_capture_<n>) and drops it.
// Output: apps/api/internal/publicreads/testdata/playerpages.golden.json (commit it).
//
// The clock is fixed (cases.now), because the profile counts experience up to today. The Go test fixes
// the same instant through Deps.Now.
import { createRequire } from 'node:module'
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, expect, test, vi } from 'vitest'

// Only the Supabase session check is replaced: nobody is signed in, so every case is a visitor.
vi.mock('../../../../packages/db/src/auth/supabase.ts', async (importOriginal) => ({
  ...(await importOriginal()),
  verifySubject: async () => null,
}))

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '../../../..')
const pkgDb = resolve(root, 'packages/db')
const testdata = resolve(here, '../../internal/publicreads/testdata')
const require = createRequire(`${pkgDb}/package.json`)
const { Client } = require('pg')

const adminUrl = process.env.ROTRA_CAPTURE_DB_URL
if (!adminUrl) throw new Error('Set ROTRA_CAPTURE_DB_URL (a local throwaway Postgres).')
const host = new URL(adminUrl).hostname
if (!['127.0.0.1', 'localhost', '::1', '[::1]'].includes(host)) throw new Error(`Refusing non-local host ${host}`)

const cases = JSON.parse(readFileSync(`${testdata}/playerpages.cases.json`, 'utf8'))
const dbName = `rotra_capture_${Date.now()}`
const dbUrl = (() => {
  const u = new URL(adminUrl)
  u.pathname = `/${dbName}`
  return u.toString()
})()

let admin
let db
const routes = {}

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
  await db.query(readFileSync(`${testdata}/playerpages.seed.sql`, 'utf8'))

  process.env.DATABASE_URL = dbUrl
  process.env.ROTRA_DATA_MODE = 'real'
  // No rank formula is approved in the product (#247); the stored rows of this fixture are read as if one were.
  ;(await import('../../../../packages/db/src/player/projections.ts')).APPROVED_RANK_ALGORITHMS.add('rank-test-v1')
  const api = '../../../../apps/player/src/app/api'
  routes.profile = (await import(`${api}/players/[playerId]/route.ts`)).GET
  routes.rank = (await import(`${api}/players/[playerId]/rank/route.ts`)).GET
  routes.games = (await import(`${api}/players/[playerId]/games/route.ts`)).GET
  routes.clubs = (await import(`${api}/players/[playerId]/clubs/route.ts`)).GET
  routes.rtr = (await import(`${api}/rtr-ids/[rtrId]/route.ts`)).GET
})

afterAll(async () => {
  vi.useRealTimers()
  const { prisma } = await import('../../../../packages/db/src/client/prisma.ts')
  await prisma.$disconnect()
  await db?.end()
  await admin?.query(`DROP DATABASE IF EXISTS ${dbName} WITH (FORCE)`)
  await admin?.end()
})

// What Next does for a dynamic segment: the raw path segment, percent-decoded.
function dispatch(path) {
  const url = new URL(path, 'http://player.test')
  const seg = url.pathname.split('/').slice(1).map((s) => decodeURIComponent(s))
  const request = new Request(url)
  if (seg[1] === 'rtr-ids') return routes.rtr(request, { params: Promise.resolve({ rtrId: seg[2] }) })
  const tail = seg[3] ?? 'profile'
  return routes[tail](request, { params: Promise.resolve({ playerId: seg[2] }) })
}

test('capture', async () => {
  const golden = {}
  // Date only: Prisma and the pg driver keep their timers.
  vi.useFakeTimers({ toFake: ['Date'], now: new Date(cases.now) })
  for (const c of cases.cases) {
    for (const stmt of cases.reset) await db.query(stmt)
    for (const stmt of cases.scenarios[c.scenario]) await db.query(stmt)
    const res = await dispatch(c.path)
    const text = await res.text()
    let body
    try {
      body = JSON.parse(text)
    } catch {
      body = { __raw: text }
    }
    golden[c.name] = {
      status: res.status,
      headers: Object.fromEntries([...res.headers.entries()].sort()),
      body,
    }
    if (c.name === 'clubs_alice') {
      // A club name led by an emoji gives a lone surrogate (w[0] is one UTF-16 unit): the wire carries the escape.
      expect(text).toContain('\\ud83dB')
      golden[c.name].rawContains = ['\\ud83dB']
    }
  }
  writeFileSync(`${testdata}/playerpages.golden.json`, `${JSON.stringify(golden, null, 2)}\n`)
  expect(Object.keys(golden).length).toBe(cases.cases.length)
})
