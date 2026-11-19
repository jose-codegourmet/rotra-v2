// Captures what the signed-in Player reads put on the wire, by running the real Player Route Handlers
// and the real @rotra/db services (Prisma) against a throwaway local Postgres. Two suites, each with its own
// seed, cases and golden file under apps/api/internal/signedin/testdata:
//   player    GET /api/me/account  /me/clubs  /me/verification  /me/notifications  /me/notifications/unread-count
//             GET /api/account/contact-change
//   sessions  GET /api/me/sessions  /me/sessions/{sessionId}/share  GET /api/invites/{clubId}
//
//   docker run -d --rm --name rotra-capture-pg -e POSTGRES_PASSWORD=test -p 127.0.0.1:55439:5432 postgres:16-alpine
//   source ~/.nvm/nvm.sh && nvm use
//   ROTRA_CAPTURE_DB_URL=postgres://postgres:test@127.0.0.1:55439/postgres \
//     node node_modules/.pnpm/vitest@*/node_modules/vitest/vitest.mjs run --config apps/api/testdata/tools/vitest.capture.config.mjs apps/api/testdata/tools/capture-signedin-player.test.mjs
//
// Refuses any host but 127.0.0.1/localhost. It creates its own database (rotra_capture_<n>) and drops it.
// Output: apps/api/internal/signedin/testdata/{player,sessions}.golden.json (commit them).
//
// Only the Supabase session check is replaced: verifySubject answers the case's player, so loadAccountContext,
// the Google deadline gate and every service run for real. Auth failures are not captured (the Go sign-in
// owns that contract). The clock is fixed per case; the Go test passes the same instant through Deps.Now.
// The Supabase `auth.users` table does not exist in the migrations, so a stand-in with the one column the
// account read looks at (encrypted_password) is created for this run only.
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

const suites = [
  {
    name: 'player',
    stubUsers: true,
    routes: {
      '/api/me/account': 'me/account',
      '/api/me/clubs': 'me/clubs',
      '/api/me/verification': 'me/verification',
      '/api/me/notifications': 'me/notifications',
      '/api/me/notifications/unread-count': 'me/notifications/unread-count',
      '/api/account/contact-change': 'account/contact-change',
    },
  },
  {
    name: 'sessions',
    stubUsers: false,
    routes: {
      '/api/me/sessions': 'me/sessions',
      '/api/me/sessions/[sessionId]/share': 'me/sessions/[sessionId]/share',
      '/api/invites/[clubId]': 'invites/[clubId]',
    },
  },
]

const dbName = `rotra_capture_${Date.now()}`
const dbUrl = (() => {
  const u = new URL(adminUrl)
  u.pathname = `/${dbName}`
  return u.toString()
})()

let admin
let db

// One database holds both suites' seeds (their rows never overlap); each suite's cases reset what they change.
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
  for (const suite of suites) await db.query(readFileSync(`${testdata}/${suite.name}.seed.sql`, 'utf8'))
  const playerCases = JSON.parse(readFileSync(`${testdata}/player.cases.json`, 'utf8'))
  await db.query('CREATE SCHEMA auth; CREATE TABLE auth.users (id uuid PRIMARY KEY, encrypted_password text)')
  for (const subject of Object.values(playerCases.subjects)) {
    const hash = playerCases.passwordless.includes(subject) ? '' : '$2a$10$stand-in-hash'
    await db.query('INSERT INTO auth.users (id, encrypted_password) VALUES ($1, $2)', [subject, hash])
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

// What Next does for a dynamic segment: the raw path segment, percent-decoded.
function dispatch(suite, routes, path) {
  const url = new URL(path, 'http://player.test')
  const parts = url.pathname.split('/').slice(1).map((s) => decodeURIComponent(s))
  const share = url.pathname.match(/^\/api\/me\/sessions\/([^/]+)\/share$/)
  const invite = url.pathname.match(/^\/api\/invites\/([^/]+)$/)
  if (share) return routes['/api/me/sessions/[sessionId]/share'](new Request(url), { params: Promise.resolve({ sessionId: parts[3] }) })
  if (invite) return routes['/api/invites/[clubId]'](new Request(url), { params: Promise.resolve({ clubId: parts[2] }) })
  return routes[url.pathname](new Request(url))
}

for (const suite of suites) {
  test(`capture ${suite.name}`, async () => {
    const cases = JSON.parse(readFileSync(`${testdata}/${suite.name}.cases.json`, 'utf8'))
    const api = '../../../../apps/player/src/app/api'
    const routes = {}
    for (const [key, dir2] of Object.entries(suite.routes)) routes[key] = (await import(`${api}/${dir2}/route.ts`)).GET

    const golden = {}
    for (const c of cases.cases) {
      // Setup runs with triggers and foreign keys off (the delete of a final request would be refused).
      await db.query('SET session_replication_role = replica')
      for (const stmt of cases.reset) await db.query(stmt)
      for (const stmt of cases.scenarios[c.scenario]) await db.query(stmt)
      await db.query('SET session_replication_role = DEFAULT')
      // Date only: Prisma and the pg driver keep their timers.
      vi.useFakeTimers({ toFake: ['Date'], now: new Date(c.now ?? cases.now) })
      globalThis.__rotraSubject = c.player
      const res = await dispatch(suite, routes, c.path)
      vi.useRealTimers()
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
    writeFileSync(`${testdata}/${suite.name}.golden.json`, `${JSON.stringify(golden, null, 2)}\n`)
    expect(Object.keys(golden).length).toBe(cases.cases.length)
  })
}
