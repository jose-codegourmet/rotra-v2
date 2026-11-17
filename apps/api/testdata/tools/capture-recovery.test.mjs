// Captures what the Player password recovery routes put on the wire, by running the real Route Handlers and the
// real @rotra/db services (Prisma) against a throwaway local Postgres:
//   POST /api/auth/password-reset   P-FORGOT (submitPasswordResetRequest): the generic acknowledgement and its validation
//   POST /api/auth/reset-password   P-RESET (resetPassword): every refusal given BEFORE the Supabase recovery token is
//                                   verified (empty password, bad token, and links consumeReviewedResetToken refuses)
//
// A reset that gets past consumeReviewedResetToken burns the link and then calls Supabase (verifyOtp, updateUser), so a
// successful reset needs a live Supabase and is not captured: the Go tests pin it from the TypeScript source
// (see internal/auth/recovery/golden_test.go). Passwords here are six characters or more: the Go password policy
// (password.Validate) runs before the token is looked at, which the TypeScript did not do.
//
//   docker run -d --rm --name rotra-capture-pg -e POSTGRES_PASSWORD=test -p 127.0.0.1:55439:5432 postgres:16-alpine
//   source ~/.nvm/nvm.sh && nvm use
//   ROTRA_CAPTURE_DB_URL=postgres://postgres:test@127.0.0.1:55439/postgres \
//     node node_modules/.pnpm/vitest@*/node_modules/vitest/vitest.mjs run --config apps/api/testdata/tools/vitest.capture.config.mjs apps/api/testdata/tools/capture-recovery.test.mjs
//
// Refuses any host but 127.0.0.1/localhost. It creates its own database (rotra_capture_<n>) and drops it.
// Output: apps/api/internal/auth/recovery/testdata/recovery.golden.json (commit it). Cases run in file order.
// `next/headers` is a stub (vitest.capture.config.mjs).
import { createRequire } from 'node:module'
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, expect, test, vi } from 'vitest'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '../../../..')
const pkgDb = resolve(root, 'packages/db')
const testdata = resolve(here, '../../internal/auth/recovery/testdata')
const require = createRequire(`${pkgDb}/package.json`)
const { Client } = require('pg')

const adminUrl = process.env.ROTRA_CAPTURE_DB_URL
if (!adminUrl) throw new Error('Set ROTRA_CAPTURE_DB_URL (a local throwaway Postgres).')
const host = new URL(adminUrl).hostname
if (!['127.0.0.1', 'localhost', '::1', '[::1]'].includes(host)) throw new Error(`Refusing non-local host ${host}`)

const cases = JSON.parse(readFileSync(`${testdata}/recovery.cases.json`, 'utf8'))
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
  await db.query(readFileSync(`${testdata}/recovery.seed.sql`, 'utf8'))

  process.env.DATABASE_URL = dbUrl
  process.env.ROTRA_DATA_MODE = 'real'
  const api = '../../../../apps/player/src/app/api/auth'
  routes['password-reset'] = (await import(`${api}/password-reset/route.ts`)).POST
  routes['reset-password'] = (await import(`${api}/reset-password/route.ts`)).POST
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
  vi.useFakeTimers({ toFake: ['Date'], now: new Date(cases.now) })
  for (const c of cases.cases) {
    const res = await routes[c.route](
      new Request(`http://player.test/api/auth/${c.route}`, {
        method: 'POST',
        body: c.rawBody !== undefined ? c.rawBody : JSON.stringify(c.body),
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    const text = await res.text()
    let body
    try {
      body = JSON.parse(text)
    } catch {
      body = { __raw: text }
    }
    golden[c.name] = { status: res.status, headers: Object.fromEntries([...res.headers.entries()].sort()), body }
  }
  writeFileSync(`${testdata}/recovery.golden.json`, `${JSON.stringify(golden, null, 2)}\n`)
  expect(Object.keys(golden).length).toBe(cases.cases.length)
})
