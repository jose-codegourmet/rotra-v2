// Captures what GET /api/leaderboard and /api/leaderboard/search put on the wire, by running the real
// Player Route Handlers and the real @rotra/db service (Prisma) against a throwaway local Postgres.
//
//   docker run -d --rm --name rotra-capture-pg -e POSTGRES_PASSWORD=test -p 127.0.0.1:55439:5432 postgres:16-alpine
//   source ~/.nvm/nvm.sh && nvm use
//   ROTRA_CAPTURE_DB_URL=postgres://postgres:test@127.0.0.1:55439/postgres \
//     node node_modules/.pnpm/vitest@*/node_modules/vitest/vitest.mjs run --config apps/api/testdata/tools/vitest.capture.config.mjs
//
// Refuses any host but 127.0.0.1/localhost. It creates its own database (rotra_capture_<n>) and drops it.
// Output: apps/api/internal/publicreads/testdata/leaderboard.golden.json (commit it).
//
// APPROVED_RANK_ALGORITHMS is empty in the product (#247: no rank formula approved). Cases with
// "approved": true add the fixture's algorithm to that set for the run, which is the only way to see
// the listed path. The Set is mutated in the test process only.
import { createRequire } from 'node:module'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, expect, test } from 'vitest'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '../../../..')
const pkgDb = resolve(root, 'packages/db')
const publicreads = resolve(here, '../../internal/publicreads/testdata')
const require = createRequire(`${pkgDb}/package.json`)
const { Client } = require('pg')

const adminUrl = process.env.ROTRA_CAPTURE_DB_URL
if (!adminUrl) throw new Error('Set ROTRA_CAPTURE_DB_URL (a local throwaway Postgres).')
const host = new URL(adminUrl).hostname
if (!['127.0.0.1', 'localhost', '::1', '[::1]'].includes(host)) throw new Error(`Refusing non-local host ${host}`)

const cases = JSON.parse(readFileSync(`${publicreads}/leaderboard.cases.json`, 'utf8'))
const dbName = `rotra_capture_${Date.now()}`
const dbUrl = (() => {
  const u = new URL(adminUrl)
  u.pathname = `/${dbName}`
  return u.toString()
})()

let admin
let db
let page
let search
let approvedSet

async function sql(client, text) {
  await client.query(text)
}

beforeAll(async () => {
  admin = new Client({ connectionString: adminUrl })
  await admin.connect()
  await sql(admin, `CREATE DATABASE ${dbName}`)
  db = new Client({ connectionString: dbUrl })
  await db.connect()
  for (const role of ['anon', 'authenticated', 'service_role']) {
    await sql(admin, `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${role}') THEN CREATE ROLE ${role} NOLOGIN; END IF; END $$`)
  }
  const { readdirSync } = await import('node:fs')
  const dir = `${pkgDb}/prisma/migrations`
  for (const name of readdirSync(dir).filter((n) => /^\d/.test(n)).sort()) {
    await sql(db, readFileSync(`${dir}/${name}/migration.sql`, 'utf8'))
  }
  await sql(db, readFileSync(`${publicreads}/leaderboard.seed.sql`, 'utf8'))

  process.env.DATABASE_URL = dbUrl
  process.env.ROTRA_DATA_MODE = 'real'
  ;({ APPROVED_RANK_ALGORITHMS: approvedSet } = await import('../../../../packages/db/src/player/projections.ts'))
  ;({ GET: page } = await import('../../../../apps/player/src/app/api/leaderboard/route.ts'))
  ;({ GET: search } = await import('../../../../apps/player/src/app/api/leaderboard/search/route.ts'))
})

afterAll(async () => {
  const { prisma } = await import('../../../../packages/db/src/client/prisma.ts')
  await prisma.$disconnect()
  await db?.end()
  await admin?.query(`DROP DATABASE IF EXISTS ${dbName} WITH (FORCE)`)
  await admin?.end()
})

test('capture', async () => {
  const golden = {}
  for (const c of cases.cases) {
    for (const stmt of cases.reset) await sql(db, stmt)
    for (const stmt of cases.scenarios[c.scenario]) await sql(db, stmt)
    approvedSet.clear()
    if (c.approved) for (const a of cases.approved) approvedSet.add(a)
    const url = new URL(c.path, 'http://player.test')
    const handler = url.pathname === '/api/leaderboard/search' ? search : page
    const res = await handler(new Request(url))
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
  }
  writeFileSync(`${publicreads}/leaderboard.golden.json`, `${JSON.stringify(golden, null, 2)}\n`)
  expect(Object.keys(golden).length).toBe(cases.cases.length)
})
