// Captures what the public club page, shown banners, shown characters, character image and ranking settings
// reads put on the wire, by running the real Route Handlers and the real @rotra/db services (Prisma)
// against a throwaway local Postgres:
//   GET /api/clubs/{clubId}                 Queue's handler: no viewer (Player's reads a sign-in cookie; Go cannot yet)
//   GET /api/profile-banners/shown          GET /api/profile-characters/shown
//   GET /api/profile-characters/{id}/image  GET /api/ranking-settings
//
//   docker run -d --rm --name rotra-capture-pg -e POSTGRES_PASSWORD=test -p 127.0.0.1:55439:5432 postgres:16-alpine
//   source ~/.nvm/nvm.sh && nvm use
//   ROTRA_CAPTURE_DB_URL=postgres://postgres:test@127.0.0.1:55439/postgres \
//     node node_modules/.pnpm/vitest@*/node_modules/vitest/vitest.mjs run --config apps/api/testdata/tools/vitest.capture.config.mjs apps/api/testdata/tools/capture-clubpage.test.mjs
//
// Refuses any host but 127.0.0.1/localhost. It creates its own database (rotra_capture_<n>) and drops it.
// Output: apps/api/internal/publicreads/testdata/clubpage.golden.json (commit it).
//
// The clock is fixed (cases.now): the club page keeps a done session's page for 90 days from "now".
// Image bodies are stored as base64 (they are bytes). The Go test fixes the same instant through Deps.Now.
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

const cases = JSON.parse(readFileSync(`${testdata}/clubpage.cases.json`, 'utf8'))
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
  await db.query(readFileSync(`${testdata}/clubpage.seed.sql`, 'utf8'))
  // the image route's rows: hidden and deleted ones included, because the route resolves them all
  for (const r of cases.images) {
    await db.query(
      `INSERT INTO profile_characters (id, image, shown, uploaded_at, number, deleted_at)
       VALUES ($1, $2, $3, TIMESTAMPTZ '2026-11-12 00:00:00+00' + $4 * INTERVAL '1 millisecond', $5, CASE WHEN $6::boolean THEN TIMESTAMPTZ '2026-11-13 00:00:00+00' END)`,
      [r.id, r.image, r.shown, r.number, r.number, r.deleted],
    )
  }

  process.env.DATABASE_URL = dbUrl
  process.env.ROTRA_DATA_MODE = 'real'
  const queue = '../../../../apps/queue/src/app/api'
  const player = '../../../../apps/player/src/app/api'
  routes.club = (await import(`${queue}/clubs/[clubId]/route.ts`)).GET
  routes.banners = (await import(`${queue}/profile-banners/shown/route.ts`)).GET
  routes.image = (await import(`${queue}/profile-characters/[id]/image/route.ts`)).GET
  routes.characters = (await import(`${player}/profile-characters/shown/route.ts`)).GET
  routes.ranking = (await import(`${player}/ranking-settings/route.ts`)).GET
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
  const url = new URL(path, 'http://queue.test')
  const seg = url.pathname.split('/').slice(1).map((s) => decodeURIComponent(s))
  const request = new Request(url)
  const ctx = (params) => ({ params: Promise.resolve(params) })
  if (seg[1] === 'clubs') return routes.club(request, ctx({ clubId: seg[2] }))
  if (seg[1] === 'profile-banners') return routes.banners()
  if (seg[1] === 'ranking-settings') return routes.ranking()
  if (seg[2] === 'shown') return routes.characters()
  return routes.image(request, ctx({ id: seg[2] }))
}

test('capture', async () => {
  const golden = {}
  // Date only: Prisma and the pg driver keep their timers.
  vi.useFakeTimers({ toFake: ['Date'], now: new Date(cases.now) })
  const quiet = vi.spyOn(console, 'error').mockImplementation(() => {})
  for (const c of cases.cases) {
    for (const stmt of cases.reset) await db.query(stmt)
    for (const stmt of cases.scenarios[c.scenario]) await db.query(stmt)
    const res = await dispatch(c.path)
    const bytes = Buffer.from(await res.arrayBuffer())
    const headers = Object.fromEntries([...res.headers.entries()].sort())
    golden[c.name] = { status: res.status, headers }
    if (headers['content-type'] === 'application/json') golden[c.name].body = JSON.parse(bytes.toString('utf8'))
    else golden[c.name].bodyBase64 = bytes.toString('base64')
    if (c.name === 'club_d_sessions') {
      // A club name led by an emoji gives a lone surrogate (w[0] is one UTF-16 unit): the wire carries the escape.
      const text = bytes.toString('utf8')
      expect(text).toContain('\\ud83dB')
      golden[c.name].rawContains = ['\\ud83dB']
    }
  }
  quiet.mockRestore()
  writeFileSync(`${testdata}/clubpage.golden.json`, `${JSON.stringify(golden, null, 1)}\n`)
  expect(Object.keys(golden).length).toBe(cases.cases.length)
})
