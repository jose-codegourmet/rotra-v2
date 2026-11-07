import 'server-only'
import { clubLoginEmail } from '../admin/club-identity'
import { prisma } from '../client/prisma'
import { loadAccountContext } from './account-context'
import { dataMode, MOCK_COOKIE_PREFIX } from './data-mode'
import { AUTH_PROVIDER, type CookieAdapter, createSupabaseServer } from './supabase'

/** The apps with a password sign-in: Queue (club), Player Information (player, email only) and Admin. */
export type SignInAudience = 'club' | 'player' | 'admin'

const HEADERS = {
  'Cache-Control': 'private, no-store',
  Vary: 'Cookie',
  'Content-Type': 'application/json',
} as const

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: HEADERS })

const fail = (status: number, code: string, message: string) =>
  json(status, { error: { code, message } })

/** Invalid-credential copy: Admin's is from ticket #186; the club wording mirrors it (gap logged). */
const INVALID: Record<SignInAudience, string> = {
  admin: 'Email or password is incorrect.',
  club: 'Username or password is incorrect.',
  player: "That email and password don't match. Check them and try again.",
}

function withoutMockCookies(cookies: CookieAdapter): CookieAdapter {
  return {
    getAll: () => cookies.getAll().filter((cookie) => !cookie.name.startsWith(MOCK_COOKIE_PREFIX)),
    setAll: (values, headers) => cookies.setAll(values, headers),
  }
}

/** The session body each app's existing hooks read: Queue/Player `MockSession`, Admin `AdminSession`. */
async function sessionBody(audience: SignInAudience, subject: string, email: string | null) {
  const context = await loadAccountContext({ provider: AUTH_PROVIDER, subject }, audience)
  if (audience === 'admin') {
    if (!context || context.kind !== 'admin')
      return { kind: 'denied', accountDescription: email ?? 'This account' }
    return { kind: 'owner', account: { id: context.adminId, email: email ?? '' } }
  }
  if (audience === 'player') {
    if (!context || context.kind !== 'player') return null
    const player = await prisma.player.findUniqueOrThrow({
      where: { id: context.playerId },
      select: { id: true, fullName: true },
    })
    return { account: { id: player.id, name: player.fullName, audience: 'player' } }
  }
  if (!context || context.kind !== 'club') return null
  const club = await prisma.club.findUniqueOrThrow({
    where: { id: context.clubId },
    select: { id: true, name: true },
  })
  return { account: { id: club.id, name: club.name, audience: 'club' } }
}

/**
 * POST sign-in. Real data mode only. Club usernames map to their provider login email; players
 * sign in with their email only (a phone number is never looked up). The Supabase session cookies
 * are set through `cookies`. A club or player credential that maps to no usable account is signed
 * out again and refused with the same generic error; an Admin one without platform authority gets
 * `denied`.
 */
export async function handleSignIn(
  audience: SignInAudience,
  cookies: CookieAdapter,
  input: { identifier?: unknown; password?: unknown },
): Promise<Response> {
  if (dataMode() !== 'real') return fail(503, 'unavailable', 'This is not available right now.')
  const identifier = typeof input.identifier === 'string' ? input.identifier.trim() : ''
  const password = typeof input.password === 'string' ? input.password : ''
  if (!identifier || !password)
    return fail(
      422,
      'invalid',
      audience === 'club'
        ? 'Enter your club username and password.'
        : audience === 'player'
          ? 'Enter your email and password.'
          : 'Enter your sign-in details.',
    )
  const supabase = createSupabaseServer(withoutMockCookies(cookies), audience)
  const email = audience === 'club' ? clubLoginEmail(identifier) : identifier.toLowerCase()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error || !data.user) {
    if (error?.status && error.status >= 500)
      return fail(503, 'unavailable', 'Signing in is not available right now. Try again.')
    return fail(401, 'unauthenticated', INVALID[audience])
  }
  const body = await sessionBody(audience, data.user.id, data.user.email ?? null)
  if (!body) {
    await supabase.auth.signOut()
    return fail(401, 'unauthenticated', INVALID[audience])
  }
  return json(200, body)
}

/** GET session: the verified session as the app's hooks expect it, or signed out. */
export async function handleSessionRead(
  audience: SignInAudience,
  cookies: CookieAdapter,
): Promise<Response> {
  const signedOut = audience === 'admin' ? { kind: 'signed-out', sessionEnded: false } : null
  if (dataMode() !== 'real') return json(200, signedOut)
  const supabase = createSupabaseServer(withoutMockCookies(cookies), audience)
  const { data, error } = await supabase.auth.getClaims()
  const subject = data?.claims?.sub
  if (error || typeof subject !== 'string' || !subject) return json(200, signedOut)
  const email = typeof data?.claims?.email === 'string' ? data.claims.email : null
  return json(200, (await sessionBody(audience, subject, email)) ?? signedOut)
}

/** POST sign-out: ends the provider session on this device and clears its cookies. */
export async function handleSignOut(
  audience: SignInAudience,
  cookies: CookieAdapter,
  ended = false,
): Promise<Response> {
  if (dataMode() === 'real')
    await createSupabaseServer(withoutMockCookies(cookies), audience).auth.signOut({
      scope: 'local',
    })
  return json(200, audience === 'admin' ? { kind: 'signed-out', sessionEnded: ended } : null)
}
