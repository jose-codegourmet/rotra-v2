/**
 * The one safety check for the e2e suite. Every setup, seed and reset script, the Playwright config
 * and the app-server clock call it before touching a database or Supabase. It refuses unless every
 * connection points at the throwaway LOCAL stack: Postgres on 127.0.0.1/localhost:54322, database
 * `rotra_disposable_e2e`, and Supabase at http://127.0.0.1:54321. There is no override.
 *
 * Plain, erasable TypeScript only: `server-clock.mjs` imports this file through Node's type
 * stripping, inside the app servers.
 */

export const E2E_DB_NAME = 'rotra_disposable_e2e'
export const E2E_DB_PORT = '54322'
export const E2E_SUPABASE_URL = 'http://127.0.0.1:54321'
const LOCAL_HOSTS = ['127.0.0.1', 'localhost']

export class E2eGuardError extends Error {
  constructor(message: string) {
    super(`[e2e guard] Refusing: ${message}`)
    this.name = 'E2eGuardError'
  }
}

/** Throws unless `url` is a Postgres URL on the local e2e port; `database` defaults to the e2e one. */
export function assertLocalDbUrl(name: string, url: string | undefined, database = E2E_DB_NAME) {
  if (!url) throw new E2eGuardError(`${name} is not set.`)
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new E2eGuardError(`${name} is not a valid URL.`)
  }
  if (parsed.protocol !== 'postgresql:' && parsed.protocol !== 'postgres:')
    throw new E2eGuardError(`${name} is not a postgresql:// URL.`)
  if (!LOCAL_HOSTS.includes(parsed.hostname))
    throw new E2eGuardError(`${name} host '${parsed.hostname}' is not 127.0.0.1 or localhost.`)
  if (parsed.port !== E2E_DB_PORT)
    throw new E2eGuardError(`${name} port '${parsed.port}' is not ${E2E_DB_PORT}.`)
  const db = decodeURIComponent(parsed.pathname.replace(/^\//, ''))
  if (db !== database) throw new E2eGuardError(`${name} database '${db}' is not '${database}'.`)
}

/** Throws unless SUPABASE_URL is exactly the local stack's API URL. */
export function assertLocalSupabaseUrl(url: string | undefined) {
  if (url?.replace(/\/$/, '') !== E2E_SUPABASE_URL)
    throw new E2eGuardError(`SUPABASE_URL must be ${E2E_SUPABASE_URL}.`)
}

/** The full check: DATABASE_URL, DIRECT_URL and SUPABASE_URL all point at the local e2e stack. */
export function assertE2eEnv(env: Record<string, string | undefined> = process.env) {
  assertLocalDbUrl('DATABASE_URL', env.DATABASE_URL)
  assertLocalDbUrl('DIRECT_URL', env.DIRECT_URL)
  assertLocalSupabaseUrl(env.SUPABASE_URL)
}
