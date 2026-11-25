/**
 * The one safety check for the e2e suite. Every setup, seed and reset script, the Playwright config
 * and the app-server clock call it before touching a database. It refuses unless every connection
 * points at the throwaway LOCAL Postgres: 127.0.0.1/localhost:54329, database `rotra_disposable_e2e`,
 * and the Go API at 127.0.0.1. There is no override, and no Supabase URL is allowed at all.
 * The Go API's own start-up check (apps/api/internal/testclock) allows the same host, port and name.
 *
 * Plain, erasable TypeScript only: `server-clock.mjs` imports this file through Node's type
 * stripping, inside the app servers.
 */

export const E2E_DB_NAME = 'rotra_disposable_e2e'
export const E2E_DB_PORT = '54329'
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

/** Throws unless `url` is a plain http URL on 127.0.0.1. */
export function assertLoopbackUrl(name: string, url: string | undefined) {
  let parsed: URL | undefined
  try {
    parsed = url ? new URL(url) : undefined
  } catch {
    parsed = undefined
  }
  if (!parsed || parsed.protocol !== 'http:' || parsed.hostname !== '127.0.0.1')
    throw new E2eGuardError(`${name} must be an http://127.0.0.1 URL.`)
}

/**
 * The full check: DATABASE_URL and DIRECT_URL point at the local e2e Postgres, the Go API is on the
 * loopback address, and no Supabase variable carries a value.
 */
export function assertE2eEnv(env: Record<string, string | undefined> = process.env) {
  assertLocalDbUrl('DATABASE_URL', env.DATABASE_URL)
  assertLocalDbUrl('DIRECT_URL', env.DIRECT_URL)
  assertLoopbackUrl('ROTRA_GO_API_URL', env.ROTRA_GO_API_URL)
  for (const [key, value] of Object.entries(env))
    if (/SUPABASE/i.test(key) && value)
      throw new E2eGuardError(`${key} is set; the suite runs with no Supabase.`)
}
