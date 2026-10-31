import 'server-only'
import { type CookieOptions, createServerClient } from '@supabase/ssr'

export type CookieToSet = { name: string; value: string; options: CookieOptions }

/**
 * The cookie access a Route Handler (`await cookies()`) or `proxy.ts` (request/response) provides.
 * `setAll` also receives the no-store headers Supabase sends whenever it refreshes auth cookies.
 */
export type CookieAdapter = {
  getAll(): { name: string; value: string }[]
  setAll(cookies: CookieToSet[], headers: Record<string, string>): void
}

/**
 * A per-request Supabase client. Server-only env (`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`);
 * the secret key is never used here, and nothing is read from `NEXT_PUBLIC_*`.
 */
export function createSupabaseServer(cookies: CookieAdapter) {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY must be set')
  return createServerClient(url, key, { cookies })
}

/** Provider name stored in `*_accounts.auth_provider`. */
export const AUTH_PROVIDER = 'supabase'

export type VerifiedSubject = { provider: typeof AUTH_PROVIDER; subject: string }

/**
 * Verifies the session JWT (signature checked against the project's JWKS by `getClaims`) and
 * refreshes cookies through the adapter. Never trusts `getSession()` or user-editable metadata.
 */
export async function verifySubject(cookies: CookieAdapter): Promise<VerifiedSubject | null> {
  const supabase = createSupabaseServer(cookies)
  const { data, error } = await supabase.auth.getClaims()
  const subject = data?.claims?.sub
  if (error || typeof subject !== 'string' || !subject) return null
  return { provider: AUTH_PROVIDER, subject }
}
