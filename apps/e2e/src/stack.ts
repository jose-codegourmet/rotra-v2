import { createHash } from 'node:crypto'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { assertE2eEnv, E2E_DB_NAME, E2E_DB_PORT } from './guard.ts'

/** Paths and ports of the e2e stack. Nothing here reads a `.env*` file. */
export const E2E_DIR = join(dirname(fileURLToPath(import.meta.url)), '..')
export const REPO_ROOT = join(E2E_DIR, '..', '..')
export const STATE_DIR = join(E2E_DIR, '.e2e')
export const ACCOUNTS_FILE = join(STATE_DIR, 'accounts.json')
export const SERVER_CLOCK = join(E2E_DIR, 'src', 'server-clock.mjs')
export const GO_BINARY = join(STATE_DIR, 'bin', 'rotra-api')
export const GO_LOG = join(STATE_DIR, 'go-api.log')

export const APPS = {
  queue: { dir: 'apps/queue', port: 9100, clockPort: 9190 },
  player: { dir: 'apps/player', port: 9101, clockPort: 9191 },
  admin: { dir: 'apps/admin', port: 9102, clockPort: 9192 },
} as const
export type AppName = keyof typeof APPS
export const appUrl = (app: AppName) => `http://127.0.0.1:${APPS[app].port}`

/** The Go API (apps/api, built with `-tags e2e`) and its test clock's control endpoint. */
export const GO_API = { port: 9103, clockPort: 9193 } as const
export const GO_API_URL = `http://127.0.0.1:${GO_API.port}`
export const GO_CLOCK_URL = `http://127.0.0.1:${GO_API.clockPort}/clock`

/** The throwaway Postgres: a Docker container on a fixed loopback port. */
export const E2E_PG_CONTAINER = 'rotra-e2e-pg'
export const E2E_PG_IMAGE = 'postgres:16-alpine'
export const E2E_DB_URL = `postgresql://postgres:postgres@127.0.0.1:${E2E_DB_PORT}/${E2E_DB_NAME}`

// Fixed local test values, never real secrets. The proxy secret is the one the apps send and Go
// expects; the receipt secret must be the SAME value in Node and Go; the pass signing key is an
// Ed25519 seed (unpadded base64url) that only this throwaway stack knows.
export const PROXY_SECRET = 'rotra-e2e-proxy-secret-local-only-0123456789'
const VISITOR_RECEIPT_SECRET = 'rotra-e2e-visitor-receipt-secret-local-only-0123456789'
const AUTH_SIGNING_KEY = createHash('sha256')
  .update('rotra-e2e-pass-signing-key-local-only')
  .digest('base64url')

/**
 * Every variable the apps read, set EXPLICITLY. Next.js never lets a `.env*` file override a variable
 * already in process.env (an empty string counts as set), so these values always win. The Supabase
 * variables are blanked and the keys found in the apps' local env files too, so nothing (OpenTelemetry
 * export included) leaks in from them. All of `/api` goes to the Go API: the list staging will use.
 */
export function e2eEnv(): Record<string, string> {
  const env = {
    DATABASE_URL: E2E_DB_URL,
    DIRECT_URL: E2E_DB_URL,
    DATABASE_POOL_MAX: '5',
    DATABASE_STATEMENT_TIMEOUT_MS: '10000',
    DATABASE_TX_MAX_WAIT_MS: '10000',
    DATABASE_TX_TIMEOUT_MS: '30000',
    SUPABASE_URL: '',
    SUPABASE_PUBLISHABLE_KEY: '',
    SUPABASE_SECRET_KEY: '',
    SUPABASE_JWKS_URL: '',
    NEXT_PUBLIC_SUPABASE_URL: '',
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: '',
    ROTRA_DATA_MODE: 'real',
    NEXT_PUBLIC_ROTRA_DATA_MODE: 'real',
    NEXT_PUBLIC_ROTRA_DEV_MENU: '',
    ROTRA_GO_API_URL: GO_API_URL,
    ROTRA_GO_MOVED_AREAS: '/api',
    ROTRA_PROXY_SECRET: PROXY_SECRET,
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
export function appServerEnv(app: AppName): Record<string, string> {
  return {
    ...e2eEnv(),
    // Own build dir, so a normal `pnpm dev` on 9000-9002 can keep running alongside.
    ROTRA_DIST_DIR: '.next-e2e',
    ROTRA_E2E_CLOCK: '1',
    ROTRA_E2E_CLOCK_PORT: String(APPS[app].clockPort),
    ROTRA_E2E_CLOCK_STATE: join(STATE_DIR, `clock-${app}.json`),
    NODE_OPTIONS: `--import ${SERVER_CLOCK}`,
  }
}

/**
 * The env for the Go API: only what it needs, all fixed local test values.
 */
export function goApiEnv(): Record<string, string> {
  const env = {
    PATH: process.env.PATH ?? '',
    DATABASE_URL: E2E_DB_URL,
    DATABASE_DIRECT_URL: E2E_DB_URL,
    PORT: String(GO_API.port),
    LOG_LEVEL: 'info',
    ROTRA_PROXY_SECRET: PROXY_SECRET,
    ROTRA_AUTH_SIGNING_KEY: AUTH_SIGNING_KEY,
    ROTRA_VISITOR_RECEIPT_SECRET: VISITOR_RECEIPT_SECRET,
    ROTRA_ALLOWED_ORIGINS: [appUrl('queue'), appUrl('player'), appUrl('admin')].join(','),
    ROTRA_QUEUE_ORIGINS: appUrl('queue'),
    ROTRA_E2E_CLOCK: '1',
    ROTRA_E2E_CLOCK_ADDR: `127.0.0.1:${GO_API.clockPort}`,
  }
  assertE2eEnv({ ...env, DIRECT_URL: E2E_DB_URL, ROTRA_GO_API_URL: GO_API_URL })
  return env
}
