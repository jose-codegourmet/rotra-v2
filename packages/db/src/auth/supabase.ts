import 'server-only'
import { type CookieOptions, createServerClient } from '@supabase/ssr'
import type { AccountAudience } from './account-context'

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
 * Each app keeps its own sign-in cookie. Cookies ignore the port (and are shared across a parent
 * domain), so Supabase's default `sb-<project>-auth-token` would make Queue, Player Information and
 * Admin one shared session: signing in as a club would replace the Admin sign-in, and signing out
 * of one app would sign out of the others.
 */
export function authCookieName(audience: AccountAudience) {
  return `sb-rotra-${audience}-auth`
}

/**
 * A per-request Supabase client for one app's sign-in cookie. Server-only env (`SUPABASE_URL`,
 * `SUPABASE_PUBLISHABLE_KEY`); the secret key is never used here, and nothing is read from
 * `NEXT_PUBLIC_*`.
 */
export function createSupabaseServer(cookies: CookieAdapter, audience: AccountAudience) {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY must be set')
  return createServerClient(url, key, {
    cookies,
    cookieOptions: { name: authCookieName(audience) },
  })
}

/** Provider name stored in `*_accounts.auth_provider`. */
export const AUTH_PROVIDER = 'supabase'

/**
 * `oauth`: the session was started by an OAuth provider (Google) rather than a password. Such a
 * session only counts where ROTRA's own record says Google is connected (`loadAccountContext`).
 */
export type VerifiedSubject = { provider: typeof AUTH_PROVIDER; subject: string; oauth?: boolean }

/**
 * Whether a verified JWT's `amr` claim names the OAuth method. Supabase keeps a session's methods
 * for its whole life (a refresh adds `token_refresh`, it never drops `oauth`). Both claim formats
 * are read: `['oauth']` and `[{ method: 'oauth', timestamp }]`.
 */
export function startedWithOAuth(amr: unknown): boolean {
  return (
    Array.isArray(amr) &&
    amr.some(
      (entry) =>
        (typeof entry === 'string' ? entry : (entry as { method?: unknown } | null)?.method) ===
        'oauth',
    )
  )
}

/**
 * Verifies the session JWT (signature checked against the project's JWKS by `getClaims`) and
 * refreshes cookies through the adapter. Never trusts `getSession()` or user-editable metadata.
 */
export async function verifySubject(
  cookies: CookieAdapter,
  audience: AccountAudience,
): Promise<VerifiedSubject | null> {
  const supabase = createSupabaseServer(cookies, audience)
  const { data, error } = await supabase.auth.getClaims()
  const subject = data?.claims?.sub
  if (error || typeof subject !== 'string' || !subject) return null
  return { provider: AUTH_PROVIDER, subject, oauth: startedWithOAuth(data?.claims?.amr) }
}
