import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { assertE2eEnv, assertLocalSupabaseUrl, E2E_DB_NAME, E2E_DB_PORT } from './guard.ts'

/** Paths and ports of the e2e stack. Nothing here reads a `.env*` file. */
export const E2E_DIR = join(dirname(fileURLToPath(import.meta.url)), '..')
export const REPO_ROOT = join(E2E_DIR, '..', '..')
export const STATE_DIR = join(E2E_DIR, '.e2e')
export const STACK_FILE = join(STATE_DIR, 'stack.json')
export const ACCOUNTS_FILE = join(STATE_DIR, 'accounts.json')
export const SERVER_CLOCK = join(E2E_DIR, 'src', 'server-clock.mjs')

export const APPS = {
  queue: { dir: 'apps/queue', port: 9100, clockPort: 9190 },
  player: { dir: 'apps/player', port: 9101, clockPort: 9191 },
  admin: { dir: 'apps/admin', port: 9102, clockPort: 9192 },
} as const
export type AppName = keyof typeof APPS
export const appUrl = (app: AppName) => `http://127.0.0.1:${APPS[app].port}`

export const E2E_DB_URL = `postgresql://postgres:postgres@127.0.0.1:${E2E_DB_PORT}/${E2E_DB_NAME}`
/** The local stack's superuser, only for the auth bridge (a postgres_fdw user mapping). */
export const E2E_DB_SUPERUSER_URL = `postgresql://supabase_admin:postgres@127.0.0.1:${E2E_DB_PORT}/${E2E_DB_NAME}`
/** A fixed, fake HMAC key for visitor receipts. Local test value only. */
const VISITOR_RECEIPT_SECRET = 'rotra-e2e-visitor-receipt-secret-local-only-0123456789'

export type StackKeys = { apiUrl: string; anonKey: string; serviceRoleKey: string }

/** psql from Homebrew's postgresql@15 when present, else PATH (override with PSQL). */
export function psqlPath() {
  if (process.env.PSQL) return process.env.PSQL
  const brew = '/usr/local/opt/postgresql@15/bin/psql'
  return existsSync(brew) ? brew : 'psql'
}

/** `supabase status -o env` for the repo's local project (never `--linked`), or null if stopped. */
export function readSupabaseStatus(): StackKeys | null {
  let out: string
  try {
    out = execFileSync('supabase', ['status', '-o', 'env'], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
  } catch {
    return null
  }
  const values: Record<string, string> = {}
  for (const line of out.split('\n')) {
    const match = /^([A-Z_]+)="?(.*?)"?$/.exec(line.trim())
    if (match?.[1]) values[match[1]] = match[2] ?? ''
  }
  if (!values.API_URL || !values.ANON_KEY || !values.SERVICE_ROLE_KEY) return null
  assertLocalSupabaseUrl(values.API_URL)
  return {
    apiUrl: values.API_URL,
    anonKey: values.ANON_KEY,
    serviceRoleKey: values.SERVICE_ROLE_KEY,
  }
}

export function writeStackKeys(keys: StackKeys) {
  mkdirSync(STATE_DIR, { recursive: true })
  writeFileSync(STACK_FILE, JSON.stringify(keys, null, 2), { mode: 0o600 })
}

/** The keys `prepare` saved; run `make e2e` (or `pnpm --filter @rotra/e2e e2e:reset`) first. */
export function readStackKeys(): StackKeys {
  if (!existsSync(STACK_FILE))
    throw new Error(`[e2e] ${STACK_FILE} is missing. Run \`make e2e\` (prepare) first.`)
  const keys = JSON.parse(readFileSync(STACK_FILE, 'utf8')) as StackKeys
  assertLocalSupabaseUrl(keys.apiUrl)
  return keys
}

/**
 * Every DB and Supabase variable the apps read, set EXPLICITLY. Next.js never lets a `.env*` file
 * override a variable already in process.env (an empty string counts as set), and the Prisma CLI
 * does not load `.env`, so these values always win. The keys found in the apps' local env files are
 * blanked here too, so nothing (OpenTelemetry export included) leaks in from them.
 */
export function e2eEnv(keys: StackKeys): Record<string, string> {
  const env = {
    DATABASE_URL: E2E_DB_URL,
    DIRECT_URL: E2E_DB_URL,
    DATABASE_POOL_MAX: '5',
    DATABASE_STATEMENT_TIMEOUT_MS: '10000',
    DATABASE_TX_MAX_WAIT_MS: '10000',
    DATABASE_TX_TIMEOUT_MS: '30000',
    SUPABASE_URL: keys.apiUrl,
    SUPABASE_PUBLISHABLE_KEY: keys.anonKey,
    SUPABASE_SECRET_KEY: keys.serviceRoleKey,
    SUPABASE_JWKS_URL: `${keys.apiUrl}/auth/v1/.well-known/jwks.json`,
    NEXT_PUBLIC_SUPABASE_URL: keys.apiUrl,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: keys.anonKey,
    ROTRA_DATA_MODE: 'real',
    NEXT_PUBLIC_ROTRA_DATA_MODE: 'real',
    NEXT_PUBLIC_ROTRA_DEV_MENU: '',
    // Cross-app links and the Queue/Player Origin pair (packages/data/src/app-origins.ts).
    NEXT_PUBLIC_ROTRA_QUEUE_URL: appUrl('queue'),
    NEXT_PUBLIC_ROTRA_PLAYER_URL: appUrl('player'),
    NEXT_PUBLIC_ROTRA_ADMIN_URL: appUrl('admin'),
    ROTRA_VISITOR_RECEIPT_SECRET: VISITOR_RECEIPT_SECRET,
    OTEL_EXPORTER_OTLP_ENDPOINT: '',
    OTEL_EXPORTER_OTLP_HEADERS: '',
    OTEL_EXPORTER_OTLP_PROTOCOL: '',
    OTEL_SERVICE_NAME: '',
    DATABASE_PW: '',
    GRAFANA_KEY: '',
    NEXT_TELEMETRY_DISABLED: '1',
  }
  assertE2eEnv(env)
  return env
}

/** The env for one app server: the e2e env plus its own clock port and the server clock preload. */
export function appServerEnv(keys: StackKeys, app: AppName): Record<string, string> {
  return {
    ...e2eEnv(keys),
    // Own build dir, so a normal `pnpm dev` on 9000-9002 can keep running alongside.
    ROTRA_DIST_DIR: '.next-e2e',
    ROTRA_E2E_CLOCK: '1',
    ROTRA_E2E_CLOCK_PORT: String(APPS[app].clockPort),
    ROTRA_E2E_CLOCK_STATE: join(STATE_DIR, `clock-${app}.json`),
    NODE_OPTIONS: `--import ${SERVER_CLOCK}`,
  }
}
