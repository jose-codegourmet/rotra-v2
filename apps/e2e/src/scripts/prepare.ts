// Prepare the e2e stack: start (or reuse) the throwaway Postgres container, rebuild and migrate
// `rotra_disposable_e2e`, and build the Go API with the test clock (`-tags e2e`). The seed runs
// later, inside Playwright, once the servers are up. Needs Docker and Go; no Supabase, no psql.
//
//   node src/scripts/prepare.ts
import { execFileSync } from 'node:child_process'
import { mkdirSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { assertE2eEnv, assertLocalDbUrl, E2E_DB_NAME } from '../guard.ts'
import { ensureDatabaseServer, sql } from '../postgres.ts'
import {
  ACCOUNTS_FILE,
  e2eEnv,
  GO_BINARY,
  GO_LOG,
  goApiEnv,
  REPO_ROOT,
  STATE_DIR,
} from '../stack.ts'

function step(message: string) {
  console.log(`[e2e] ${message}`)
}

assertE2eEnv(e2eEnv())
assertLocalDbUrl('DATABASE_URL', goApiEnv().DATABASE_URL)

step('Starting or reusing the throwaway Postgres (docker)')
await ensureDatabaseServer()

step(`Rebuilding and migrating ${E2E_DB_NAME}`)
sql(`DROP DATABASE IF EXISTS "${E2E_DB_NAME}" WITH (FORCE)`, 'server')
sql(`CREATE DATABASE "${E2E_DB_NAME}"`, 'server')
// Stand-ins for the roles Supabase provided; the migrations revoke from and grant to them
// (the same three roles apps/api/internal/testpg creates). Roles are cluster-wide.
sql(
  `DO $$ BEGIN
     IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
     IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
     IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role NOLOGIN; END IF;
   END $$`,
  'server',
)
const migrations = join(REPO_ROOT, 'packages/db/prisma/migrations')
for (const dir of readdirSync(migrations).sort()) {
  if (!/^\d/.test(dir)) continue
  sql(readFileSync(join(migrations, dir, 'migration.sql'), 'utf8'))
}

step('Building the Go API with the test clock (go build -tags e2e)')
mkdirSync(join(STATE_DIR, 'bin'), { recursive: true })
execFileSync('go', ['build', '-tags', 'e2e', '-o', GO_BINARY, './cmd/api'], {
  cwd: join(REPO_ROOT, 'apps/api'),
  stdio: ['ignore', 'inherit', 'inherit'],
})

rmSync(ACCOUNTS_FILE, { force: true })
rmSync(GO_LOG, { force: true })
step(`Ready: ${E2E_DB_NAME} on 127.0.0.1:54329`)
