// Captures what the Player registration link routes put on the wire, by running the real Route Handlers and the
// real @rotra/db services (Prisma) against a throwaway local Postgres:
//   GET  /api/claim/{token}   the link read (readClaimLink)
//   POST /api/claim/{token}   every answer that is given BEFORE the Supabase login is created
//
// A successful claim, a retry after success and the details validation need a live Supabase (the provider login
// is created and the player is signed in through it), so they are not captured here: the Go tests pin them from
// the TypeScript source, with line numbers (see internal/auth/claim/golden_test.go).
//
//   docker run -d --rm --name rotra-capture-pg -e POSTGRES_PASSWORD=test -p 127.0.0.1:55439:5432 postgres:16-alpine
//   source ~/.nvm/nvm.sh && nvm use
//   ROTRA_CAPTURE_DB_URL=postgres://postgres:test@127.0.0.1:55439/postgres \
//     node node_modules/.pnpm/vitest@*/node_modules/vitest/vitest.mjs run --config apps/api/testdata/tools/vitest.capture.config.mjs apps/api/testdata/tools/capture-claim.test.mjs
//
// Refuses any host but 127.0.0.1/localhost. It creates its own database (rotra_capture_<n>) and drops it.
// Output: apps/api/internal/auth/claim/testdata/claim.golden.json (commit it).
//
// The clock is fixed (cases.now): the read compares expiry and experience with today. The Go test fixes the
// same instant through Deps.Clock. `next/headers` is a stub (vitest.capture.config.mjs).
import { createRequire } from 'node:module'
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, expect, test, vi } from 'vitest'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '../../../..')
const pkgDb = resolve(root, 'packages/db')
const testdata = resolve(here, '../../internal/auth/claim/testdata')
const require = createRequire(`${pkgDb}/package.json`)
const { Client } = require('pg')

const adminUrl = process.env.ROTRA_CAPTURE_DB_URL
if (!adminUrl) throw new Error('Set ROTRA_CAPTURE_DB_URL (a local throwaway Postgres).')
const host = new URL(adminUrl).hostname
if (!['127.0.0.1', 'localhost', '::1', '[::1]'].includes(host)) throw new Error(`Refusing non-local host ${host}`)

const cases = JSON.parse(readFileSync(`${testdata}/claim.cases.json`, 'utf8'))
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
  await db.query(readFileSync(`${testdata}/claim.seed.sql`, 'utf8'))

  process.env.DATABASE_URL = dbUrl
  process.env.ROTRA_DATA_MODE = 'real'
  const api = '../../../../apps/player/src/app/api'
  const mod = await import(`${api}/claim/[token]/route.ts`)
  routes.GET = mod.GET
  routes.POST = mod.POST
})

afterAll(async () => {
  vi.useRealTimers()
  const { prisma } = await import('../../../../packages/db/src/client/prisma.ts')
  await prisma.$disconnect()
  await db?.end()
  await admin?.query(`DROP DATABASE IF EXISTS ${dbName} WITH (FORCE)`)
  await admin?.end()
})

test('capture', async () => {
  const golden = {}
  // Date only: Prisma and the pg driver keep their timers.
  vi.useFakeTimers({ toFake: ['Date'], now: new Date(cases.now) })
  for (const c of cases.cases) {
    const url = `http://player.test/api/claim/${encodeURIComponent(c.token)}`
    const init = { method: c.method }
    if (c.method === 'POST') {
      init.body = c.rawBody !== undefined ? c.rawBody : JSON.stringify(c.body)
      init.headers = { 'Content-Type': 'application/json' }
    }
    const res = await routes[c.method](new Request(url, init), { params: Promise.resolve({ token: c.token }) })
    const text = await res.text()
    let body
    try {
      body = JSON.parse(text)
    } catch {
      body = { __raw: text }
    }
    golden[c.name] = { status: res.status, headers: Object.fromEntries([...res.headers.entries()].sort()), body }
  }
  writeFileSync(`${testdata}/claim.golden.json`, `${JSON.stringify(golden, null, 2)}\n`)
  expect(Object.keys(golden).length).toBe(cases.cases.length)
})
