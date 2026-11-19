// Captures what the signed-in session page reads of the Player app put on the wire, by running the real Route Handlers
// and the real @rotra/db services (Prisma) against a throwaway local Postgres:
//   GET /api/public-sessions/{slug}/access  /my-night  /match-history  /match-request  /match-request/options
//   GET /api/players/{playerId}/compare
//
//   python3 apps/api/testdata/tools/gen-signedin-pubsession-fixtures.py        # writes the seed and the cases
//   docker run -d --rm --name rotra-capture-pg -e POSTGRES_PASSWORD=test -p 127.0.0.1:55439:5432 postgres:16-alpine
//   source ~/.nvm/nvm.sh && nvm use
//   ROTRA_CAPTURE_DB_URL=postgres://postgres:test@127.0.0.1:55439/postgres \
//     node node_modules/.pnpm/vitest@*/node_modules/vitest/vitest.mjs run --config apps/api/testdata/tools/vitest.capture.config.mjs apps/api/testdata/tools/capture-signedin-pubsession.test.mjs
//
// Refuses any host but 127.0.0.1/localhost. It creates its own database (rotra_capture_<n>) and drops it.
// Output: apps/api/internal/signedin/testdata/pubsession.golden.json (commit it).
//
// Only the Supabase session check is replaced: verifySubject answers the case's player (a case with no player is a
// visitor), so loadAccountContext, the Google gate and every service run for real. The clock is fixed per case (Date
// only); the Go test passes the same instant through Deps.Now. The session page reads are credentialed calls from the
// paired Queue origin (localhost:9000) to the Player origin (localhost:9001). A case that answers 500 fails the capture.
import { createRequire } from 'node:module'
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
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
const require = createRequire(`${pkgDb}/package.json`)
const { Client } = require('pg')

const adminUrl = process.env.ROTRA_CAPTURE_DB_URL
if (!adminUrl) throw new Error('Set ROTRA_CAPTURE_DB_URL (a local throwaway Postgres).')
const host = new URL(adminUrl).hostname
if (!['127.0.0.1', 'localhost', '::1', '[::1]'].includes(host)) throw new Error(`Refusing non-local host ${host}`)

const cases = JSON.parse(readFileSync(`${testdata}/pubsession.cases.json`, 'utf8'))
const dbName = `rotra_capture_${Date.now()}`
const dbUrl = (() => {
  const u = new URL(adminUrl)
  u.pathname = `/${dbName}`
  return u.toString()
})()

let admin
let db
let approvedSet
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
  await db.query(readFileSync(`${testdata}/pubsession.seed.sql`, 'utf8'))
  process.env.DATABASE_URL = dbUrl
  process.env.ROTRA_DATA_MODE = 'real'
  ;({ APPROVED_RANK_ALGORITHMS: approvedSet } = await import('../../../../packages/db/src/player/projections.ts'))
  const api = '../../../../apps/player/src/app/api'
  routes.access = (await import(`${api}/public-sessions/[slug]/access/route.ts`)).GET
  routes.myNight = (await import(`${api}/public-sessions/[slug]/my-night/route.ts`)).GET
  routes.history = (await import(`${api}/public-sessions/[slug]/match-history/route.ts`)).GET
  routes.request = (await import(`${api}/public-sessions/[slug]/match-request/route.ts`)).GET
  routes.options = (await import(`${api}/public-sessions/[slug]/match-request/options/route.ts`)).GET
  routes.compare = (await import(`${api}/players/[playerId]/compare/route.ts`)).GET
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
function dispatch(c) {
  const url = new URL(c.path, 'http://localhost:9001')
  const seg = url.pathname.split('/').slice(1).map((s) => decodeURIComponent(s))
  const request = new Request(url, { headers: c.origin ? { Origin: c.origin } : {} })
  if (seg[1] === 'players') return routes.compare(request, { params: Promise.resolve({ playerId: seg[2] }) })
  const route = { access: routes.access, 'my-night': routes.myNight, 'match-history': routes.history }[seg[3]]
  if (route) return route(request, { params: Promise.resolve({ slug: seg[2] }) })
  return (seg[4] === 'options' ? routes.options : routes.request)(request, { params: Promise.resolve({ slug: seg[2] }) })
}

test('capture', async () => {
  expect(new Set(cases.cases.map((c) => c.name)).size).toBe(cases.cases.length)
  const golden = {}
  for (const c of cases.cases) {
    await db.query('SET session_replication_role = replica')
    for (const stmt of cases.reset) await db.query(stmt)
    for (const stmt of cases.scenarios[c.scenario]) await db.query(stmt)
    await db.query('SET session_replication_role = DEFAULT')
    approvedSet.clear()
    if (c.approved) for (const a of cases.approved) approvedSet.add(a)
    // Date only: Prisma and the pg driver keep their timers.
    vi.useFakeTimers({ toFake: ['Date'], now: new Date(c.now ?? cases.now) })
    globalThis.__rotraSubject = c.player
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
  writeFileSync(`${testdata}/pubsession.golden.json`, `${JSON.stringify(golden, null, 2)}\n`)
  expect(Object.keys(golden).length).toBe(cases.cases.length)
})
