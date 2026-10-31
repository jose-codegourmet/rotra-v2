import 'server-only'
import { type AccountAudience, type ContextFor, loadAccountContext } from '../auth/account-context'
import { dataMode, MOCK_COOKIE_PREFIX } from '../auth/data-mode'
import { type CookieAdapter, verifySubject } from '../auth/supabase'
import { errorBody, ServiceError } from './errors'
import { toJson } from './serialize'

/** A service's result: a status (default 200) and a body shaped from allowlisted fields. */
export type ServiceResult = { status?: number; body: unknown }

/** Private responses never enter a shared cache, and vary by the session cookie. */
const PRIVATE_HEADERS = {
  'Cache-Control': 'private, no-store',
  Vary: 'Cookie',
  'Content-Type': 'application/json',
} as const

function respond(status: number, body: unknown, headers: Record<string, string>) {
  return new Response(JSON.stringify(toJson(body)), { status, headers })
}

function failure(error: unknown, headers: Record<string, string>) {
  if (error instanceof ServiceError) return respond(error.status, errorBody(error), headers)
  console.error('[service] unexpected error', error instanceof Error ? error.name : typeof error)
  return respond(500, { error: { code: 'internal', message: 'Something went wrong.' } }, headers)
}

/**
 * The one entry for protected Route Handlers. In order: real data mode only; mock cookies are
 * ignored; the Supabase session is verified (and refreshed through `cookies`); the subject maps to
 * an account of the app's audience from current server state; then `run` authorizes the specific
 * club/player/entitlement with `./authorize` and returns an explicitly shaped body.
 *
 * ```ts
 * export async function GET(_req: Request, ctx: RouteContext<'/api/clubs/[clubId]'>) {
 *   const { clubId } = await ctx.params
 *   return handleAccountRequest('club', await routeCookies(), async (account) => {
 *     requireOwnClub(account, clubId)
 *     ...
 *   })
 * }
 * ```
 */
export async function handleAccountRequest<A extends AccountAudience>(
  audience: A,
  cookies: CookieAdapter,
  run: (context: ContextFor<A>) => Promise<ServiceResult>,
): Promise<Response> {
  try {
    if (dataMode() !== 'real') throw new ServiceError('unavailable')
    const verified = await verifySubject(withoutMockCookies(cookies))
    if (!verified) throw new ServiceError('unauthenticated')
    const context = await loadAccountContext(verified, audience)
    if (!context) throw new ServiceError('wrong_account')
    const result = await run(context)
    return respond(result.status ?? 200, result.body, PRIVATE_HEADERS)
  } catch (error) {
    return failure(error, PRIVATE_HEADERS)
  }
}

/**
 * Reads anyone may make. Only IDs listed here can use `handlePublicRead`; everything else needs an
 * account. Each public read returns an allowlisted projection (no contacts, claim data, costs,
 * private Off Day or raw sync data).
 */
export const PUBLIC_READS = [
  'public-session.page',
  'player.public-profile',
  'player.match-history',
  'leaderboard.list',
] as const

export type PublicReadId = (typeof PUBLIC_READS)[number]

const PUBLIC_HEADERS = {
  'Cache-Control': 'public, max-age=0, must-revalidate',
  'Content-Type': 'application/json',
} as const

export async function handlePublicRead(
  readId: PublicReadId,
  run: () => Promise<ServiceResult>,
): Promise<Response> {
  try {
    if (dataMode() !== 'real') throw new ServiceError('unavailable')
    if (!PUBLIC_READS.includes(readId)) throw new ServiceError('forbidden')
    const result = await run()
    return respond(result.status ?? 200, result.body, PUBLIC_HEADERS)
  } catch (error) {
    return failure(error, PRIVATE_HEADERS)
  }
}

/** Hides mock session markers from the Supabase client, so they can never become a session. */
function withoutMockCookies(cookies: CookieAdapter): CookieAdapter {
  return {
    getAll: () =>
      cookies.getAll().filter((cookie) => !cookie.name.startsWith(MOCK_COOKIE_PREFIX)),
    setAll: (values, headers) => cookies.setAll(values, headers),
  }
}
