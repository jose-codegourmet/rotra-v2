// Prepare the e2e stack: start (or reuse) the LOCAL Supabase, save its keys, remove the test auth
// users a previous run left, rebuild + migrate `rotra_disposable_e2e`, and bridge `auth.users` into
// it. The seed runs later, inside Playwright, once the apps are up.
//
//   node src/scripts/prepare.ts
import { execFileSync } from 'node:child_process'
import { rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { assertE2eEnv, assertLocalDbUrl, E2E_DB_NAME } from '../guard.ts'
import { deleteTestAuthUsers } from '../seed/auth-admin.ts'
import {
  ACCOUNTS_FILE,
  E2E_DB_SUPERUSER_URL,
  E2E_DB_URL,
  e2eEnv,
  psqlPath,
  REPO_ROOT,
  readSupabaseStatus,
  writeStackKeys,
} from '../stack.ts'

function step(message: string) {
  console.log(`[e2e] ${message}`)
}

let keys = readSupabaseStatus()
if (!keys) {
  step('Starting the local Supabase (supabase start)')
  execFileSync('supabase', ['start'], { cwd: REPO_ROOT, stdio: ['ignore', 'ignore', 'inherit'] })
  keys = readSupabaseStatus()
  if (!keys) throw new Error('[e2e] supabase start finished but supabase status has no keys.')
} else step('Reusing the running local Supabase')
writeStackKeys(keys)
const env = e2eEnv(keys)
assertE2eEnv(env)

step('Removing test auth users left by a previous run')
const removed = await deleteTestAuthUsers(keys)
step(`Removed ${removed} test auth user(s)`)

step(`Rebuilding and migrating ${E2E_DB_NAME}`)
assertLocalDbUrl('ROTRA_DISPOSABLE_DB_URL', E2E_DB_URL)
const psql = psqlPath()
const rebuildEnv: Record<string, string | undefined> = {
  ...process.env,
  PATH: psql.includes('/') ? `${dirname(psql)}:${process.env.PATH}` : process.env.PATH,
  ROTRA_DISPOSABLE_DB_URL: E2E_DB_URL,
  ROTRA_DISPOSABLE_CONFIRM: E2E_DB_NAME,
}
// The script refuses a URL equal to an app connection; it gets only the disposable URL.
delete rebuildEnv.DATABASE_URL
delete rebuildEnv.DIRECT_URL
execFileSync(join(REPO_ROOT, 'packages/db/scripts/disposable-db.sh'), ['rebuild'], {
  cwd: join(REPO_ROOT, 'packages/db'),
  env: rebuildEnv,
  stdio: ['ignore', 'ignore', 'inherit'],
})

// The services read `auth.users` through Prisma (registration's email check, the club-login
// fallback). In hosted Supabase that schema sits in the app database; here Auth keeps the stack's
// own `postgres` database, so a postgres_fdw foreign table exposes those columns read-only.
step('Bridging auth.users into the app database (postgres_fdw)')
assertLocalDbUrl('superuser URL', E2E_DB_SUPERUSER_URL)
execFileSync(
  psql,
  [
    E2E_DB_SUPERUSER_URL,
    '-v',
    'ON_ERROR_STOP=1',
    '-q',
    '-c',
    `CREATE EXTENSION IF NOT EXISTS postgres_fdw;
     CREATE SERVER rotra_e2e_auth FOREIGN DATA WRAPPER postgres_fdw
       OPTIONS (host '127.0.0.1', port '5432', dbname 'postgres');
     CREATE USER MAPPING FOR postgres SERVER rotra_e2e_auth
       OPTIONS (user 'postgres', password 'postgres', password_required 'false');
     CREATE SCHEMA auth AUTHORIZATION postgres;
     CREATE FOREIGN TABLE auth.users (id uuid, email text, raw_app_meta_data jsonb)
       SERVER rotra_e2e_auth OPTIONS (schema_name 'auth', table_name 'users');
     ALTER FOREIGN TABLE auth.users OWNER TO postgres;`,
  ],
  { stdio: ['ignore', 'ignore', 'inherit'] },
)

rmSync(ACCOUNTS_FILE, { force: true })
step(`Ready: ${E2E_DB_NAME} on 127.0.0.1:54322`)
