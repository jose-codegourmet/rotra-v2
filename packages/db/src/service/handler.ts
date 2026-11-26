import 'server-only'
import { dataMode, MOCK_COOKIE_PREFIX } from '@rotra/api-proxy/data-mode'
import {
  type AccountAudience,
  type AccountContext,
  type ContextFor,
  loadAccountContext,
} from '../auth/account-context'
import { type CookieAdapter, verifySubject } from '../auth/supabase'
import { GOOGLE_REQUIRED, googleRequiredFor } from '../player/google-gate'
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

/** Prisma's code and the database's own code (SQLSTATE), wherever the driver adapter puts it. */
function errorCodes(error: unknown) {
  const e = error as { code?: unknown; meta?: { code?: unknown }; cause?: { code?: unknown } }
  const code = typeof e?.code === 'string' ? e.code : undefined
  const dbCode = [e?.meta?.code, e?.cause?.code].find((c): c is string => typeof c === 'string')
  return { code, dbCode }
}

/** A malformed id in the URL (Postgres 22P02, e.g. not a UUID) names nothing: answer 404, not 500. */
const isMalformedId = (error: unknown) =>
  errorCodes(error).dbCode === '22P02' ||
  (error instanceof Error && /invalid input syntax for type uuid/.test(error.message))

function failure(error: unknown, headers: Record<string, string>) {
  if (error instanceof ServiceError) return respond(error.status, errorBody(error), headers)
  if (isMalformedId(error)) {
    const notFound = new ServiceError('not_found')
    return respond(notFound.status, errorBody(notFound), headers)
  }
  // Codes only (never the message or values): enough to find the failing rule in the database log.
  const { code, dbCode } = errorCodes(error)
  console.error(
    '[service] unexpected error',
    error instanceof Error ? error.name : typeof error,
    ...(code ? [`code=${code}`] : []),
    ...(dbCode ? [`db=${dbCode}`] : []),
  )
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
  options: {
    /**
     * Player routes only. After the Google deadline (D-2026-11-16-01) a player with no Google
     * account is refused everywhere except the few routes that pass true: the ones the connect
     * screen and the leaderboard need. Sign-out and the session read don't come through here.
     */
    allowWithoutGoogle?: boolean
  } = {},
): Promise<Response> {
  try {
    if (dataMode() !== 'real') throw new ServiceError('unavailable')
    const verified = await verifySubject(withoutMockCookies(cookies), audience)
    if (!verified) throw new ServiceError('unauthenticated')
    const context = await loadAccountContext(verified, audience)
    if (!context) throw new ServiceError('wrong_account')
    const account: AccountContext = context
    if (
      account.kind === 'player' &&
      !options.allowWithoutGoogle &&
      (await googleRequiredFor(account))
    )
      throw new ServiceError('forbidden', { google: GOOGLE_REQUIRED })
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
  /** Share payment status (#1010): masked names and amounts of the confirmed roster only */
  'public-session.payment-status',
  'player.public-profile',
  'player.match-history',
  'player.public-clubs',
  'ranking.settings',
  'profile-character.shown',
  'profile-banner.shown',
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

/**
 * Visitor commands and reads with no account: Request to join and My request (the visitor's
 * receipt rides in an httpOnly cookie the Route Handler sets), and the Player app's registration
 * link and password reset. Responses are private and never cached, unlike `handlePublicRead`.
 */
export const VISITOR_COMMANDS = [
  'public-session.join-request',
  'public-session.my-request',
  /** Transfer link card (#1012): anyone holding the link; signed in, where the viewer stands */
  'public-session.transfer-link',
  'player.claim-link',
  'player.claim',
  'player.guest-registration',
  'player.password-reset',
  /** P-CLUB-PAGE / P-CLUB-MEMBERS: public, but masked per viewer, so private and no-store */
  'player.club-page',
  'leaderboard.list',
  'player.public-profile',
  /** P-MATCH-HISTORY: masked per viewer (B-54), so private and no-store */
  'player.match-history',
  /** Google sign-in (#922): start, outcome, link, registration and claim; each checks the flag */
  'player.google-sign-in',
  /** P-INVITE: the invite card and, signed in, where the viewer stands */
  'player.invite-landing',
  /** P-MATCH-PAGE: public, but faces are masked per viewer, so private and no-store */
  'player.match-page',
] as const

export type VisitorCommandId = (typeof VISITOR_COMMANDS)[number]

export async function handleVisitorRequest(
  commandId: VisitorCommandId,
  run: () => Promise<ServiceResult>,
): Promise<Response> {
  try {
    if (dataMode() !== 'real') throw new ServiceError('unavailable')
    if (!VISITOR_COMMANDS.includes(commandId)) throw new ServiceError('forbidden')
    const result = await run()
    return respond(result.status ?? 200, result.body, PRIVATE_HEADERS)
  } catch (error) {
    return failure(error, PRIVATE_HEADERS)
  }
}

/** Hides mock session markers from the Supabase client, so they can never become a session. */
function withoutMockCookies(cookies: CookieAdapter): CookieAdapter {
  return {
    getAll: () => cookies.getAll().filter((cookie) => !cookie.name.startsWith(MOCK_COOKIE_PREFIX)),
    setAll: (values, headers) => cookies.setAll(values, headers),
  }
}
