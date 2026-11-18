import 'server-only'
import { GOOGLE_RETURN_COOKIE } from '@rotra/data/google-sign-in/config'
import { createClient, type User, type UserIdentity } from '@supabase/supabase-js'
import { MOCK_COOKIE_PREFIX } from './data-mode'
import {
  GOOGLE_FLOW_COOKIE,
  GOOGLE_PENDING_ACCESS_COOKIE,
  GOOGLE_PENDING_REFRESH_COOKIE,
  GOOGLE_RESULT_COOKIE,
} from './google-cookies'
import {
  authCookieName,
  type CookieAdapter,
  type CookieToSet,
  createSupabaseServer,
  startedWithOAuth,
} from './supabase'

/**
 * The Supabase Auth side of Google sign-in for players (D-2026-11-16-01, #922; ported to the Go API
 * with B-04, #875). Server-only. This module only talks to the provider and holds cookies; which
 * ROTRA account a Google account belongs to is decided in `player/google-sign-in.ts` from ROTRA's
 * own record, never from what the provider linked.
 *
 * How Supabase behaves, and what follows from it:
 * - `signInWithOAuth` on the server client starts a PKCE flow: the code verifier goes into a cookie
 *   and the browser is sent to Google. `exchangeCodeForSession` needs that cookie, so a code that
 *   another browser started, a replayed code or a made-up code all fail at the provider.
 * - A Google account whose verified email equals an existing user's email is attached to that user
 *   by Supabase itself, with no question asked. So the session a callback gets back is NOT proof
 *   that ROTRA connected Google: it is first kept out of the sign-in cookie (`exchangeGoogleCode`
 *   captures the cookie writes) and only applied, held or dropped once ROTRA has decided.
 * - A Google account nobody uses makes a new provider user with no ROTRA account behind it.
 * - `linkIdentity` / `unlinkIdentity` (Connect and Change while signed in) need **Allow manual
 *   linking** on in the Supabase project; with it off they fail and nothing changes.
 */

const TEN_MINUTES = 600

/** Where Continue with Google was pressed. `connect` is a signed-in player adding or changing Google. */
export type GoogleIntent = 'login' | 'register' | 'claim' | 'connect'
export type GoogleFlow = { intent: GoogleIntent; key: string; returnTo: string }

/** The Google account as the provider verified it. `email` is trimmed and lowercased. */
export type VerifiedGoogle = { email: string; name: string }

export type GoogleTokens = { accessToken: string; refreshToken: string }

/** The request's cookies plus whether it came over HTTPS (so held cookies are `Secure`). */
export type GoogleCookies = { cookies: CookieAdapter; secure: boolean }

function withoutMockCookies(cookies: CookieAdapter): CookieAdapter {
  return {
    getAll: () => cookies.getAll().filter((cookie) => !cookie.name.startsWith(MOCK_COOKIE_PREFIX)),
    setAll: (values, headers) => cookies.setAll(values, headers),
  }
}

function setCookie(jar: GoogleCookies, name: string, value: string, readable = false) {
  jar.cookies.setAll(
    [
      {
        name,
        value,
        options: {
          path: '/',
          sameSite: 'lax',
          httpOnly: !readable,
          secure: jar.secure,
          maxAge: value ? TEN_MINUTES : 0,
        },
      },
    ],
    {},
  )
}

const readCookie = (jar: GoogleCookies, name: string) =>
  jar.cookies.getAll().find((cookie) => cookie.name === name)?.value || null

const encode = (value: unknown) => Buffer.from(JSON.stringify(value), 'utf8').toString('base64url')
function decode(value: string | null): Record<string, unknown> | null {
  if (!value) return null
  try {
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as unknown
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null
  } catch {
    return null
  }
}

const INTENTS: GoogleIntent[] = ['login', 'register', 'claim', 'connect']
const KEY = /^[a-z][a-z-]{0,23}$/

/** A screen key is a short lowercase word; anything else is refused. */
export const isGoogleFlowKey = (key: unknown): key is string =>
  typeof key === 'string' && KEY.test(key)
export const isGoogleIntent = (intent: unknown): intent is GoogleIntent =>
  INTENTS.includes(intent as GoogleIntent)

/**
 * Only same-app absolute paths; never an external redirect, and never back into the API. The same
 * rule as the login screen's `returnDestination`, kept here because the server decides the redirect.
 */
export function safeReturnPath(returnTo: unknown, fallback = '/login') {
  if (typeof returnTo !== 'string' || returnTo.length > 2000) return fallback
  if (!returnTo.startsWith('/') || returnTo.startsWith('//') || returnTo.includes('\\'))
    return fallback
  try {
    const url = new URL(returnTo, 'https://rotra.local')
    if (url.origin !== 'https://rotra.local' || url.pathname.startsWith('/api/')) return fallback
    return `${url.pathname}${url.search}`
  } catch {
    return fallback
  }
}

export function readGoogleFlow(jar: GoogleCookies): GoogleFlow | null {
  const flow = decode(readCookie(jar, GOOGLE_FLOW_COOKIE))
  if (!flow || !isGoogleIntent(flow.intent) || !isGoogleFlowKey(flow.key)) return null
  return { intent: flow.intent, key: flow.key, returnTo: safeReturnPath(flow.returnTo) }
}
export const clearGoogleFlow = (jar: GoogleCookies) => setCookie(jar, GOOGLE_FLOW_COOKIE, '')

/** What the callback decided, for the screen to show. Display only; never trusted by the server. */
export type GoogleResult = {
  key: string
  intent: GoogleIntent
  outcome: 'signed-in' | 'held' | 'not-connected' | 'taken' | 'connected' | 'failed'
  email: string
  name: string
}
const OUTCOMES: GoogleResult['outcome'][] = [
  'signed-in',
  'held',
  'not-connected',
  'taken',
  'connected',
  'failed',
]

export function writeGoogleResult(jar: GoogleCookies, result: GoogleResult) {
  setCookie(jar, GOOGLE_RESULT_COOKIE, encode(result))
  setCookie(jar, GOOGLE_RETURN_COOKIE, result.key, true)
}
export function readGoogleResult(jar: GoogleCookies): GoogleResult | null {
  const result = decode(readCookie(jar, GOOGLE_RESULT_COOKIE))
  if (
    !result ||
    !isGoogleFlowKey(result.key) ||
    !isGoogleIntent(result.intent) ||
    !OUTCOMES.includes(result.outcome as GoogleResult['outcome'])
  )
    return null
  return {
    key: result.key,
    intent: result.intent,
    outcome: result.outcome as GoogleResult['outcome'],
    email: typeof result.email === 'string' ? result.email.slice(0, 320) : '',
    name: typeof result.name === 'string' ? result.name.slice(0, 200) : '',
  }
}
export function clearGoogleResult(jar: GoogleCookies) {
  setCookie(jar, GOOGLE_RESULT_COOKIE, '')
  setCookie(jar, GOOGLE_RETURN_COOKIE, '', true)
}

function plainClient() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY must be set')
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  })
}

const googleIdentities = (user: User) =>
  (user.identities ?? []).filter((identity) => identity.provider === 'google')

const stamp = (identity: UserIdentity) =>
  Date.parse(identity.last_sign_in_at ?? identity.created_at ?? '') || 0

const emailOf = (identity: UserIdentity) => {
  const email = identity.identity_data?.email
  return typeof email === 'string' ? email.trim().toLowerCase() : ''
}

/**
 * The Google account this sign-in just used: the user's Google identity with the latest sign-in.
 * Read from the provider's own identity record (never `user_metadata`, which the user can edit),
 * and only when Google says the email is verified.
 */
function usedGoogleIdentity(user: User): { identity: UserIdentity; google: VerifiedGoogle } | null {
  const identity = googleIdentities(user).sort((a, b) => stamp(b) - stamp(a))[0]
  if (!identity) return null
  const data = identity.identity_data ?? {}
  const email = emailOf(identity)
  if (data.email_verified !== true || !/^[^@\s]+@[^@\s]+$/.test(email)) return null
  const name =
    typeof data.full_name === 'string'
      ? data.full_name
      : typeof data.name === 'string'
        ? data.name
        : ''
  return { identity, google: { email, name: name.trim().slice(0, 200) } }
}

function sessionIdOf(accessToken: string): string | null {
  try {
    const payload = JSON.parse(
      Buffer.from(accessToken.split('.')[1] ?? '', 'base64url').toString('utf8'),
    ) as { session_id?: unknown }
    return typeof payload.session_id === 'string' ? payload.session_id : null
  } catch {
    return null
  }
}

/** Ends one provider session by its own token. Best effort: a failure leaves it to expire. */
async function revokeSession(accessToken: string) {
  await plainClient()
    .auth.admin.signOut(accessToken, 'local')
    .catch(() => undefined)
}

/** The verified Player sign-in on this request, if any: its subject, method and provider session. */
export async function currentPlayerSession(jar: GoogleCookies) {
  const supabase = createSupabaseServer(withoutMockCookies(jar.cookies), 'player')
  const { data, error } = await supabase.auth.getClaims()
  const subject = data?.claims?.sub
  if (error || typeof subject !== 'string' || !subject) return null
  const sessionId = data?.claims?.session_id
  return {
    subject,
    oauth: startedWithOAuth(data?.claims?.amr),
    sessionId: typeof sessionId === 'string' ? sessionId : null,
  }
}

/**
 * Starts the trip to Google and returns the URL to send the browser to. Remembers where it started
 * in the flow cookie. `connect` (signed in) asks the provider to add Google to the player's own
 * login; it first removes Google identities on that login that ROTRA does not count as connected
 * (`keepEmail` is the connected one, if any), so picking the same Google account again can attach.
 * Google always shows its account chooser, since every entry point is "pick a Google account".
 */
export async function startGoogleFlow(
  jar: GoogleCookies,
  input: { flow: GoogleFlow; origin: string; keepEmail?: string | null },
): Promise<string | null> {
  const supabase = createSupabaseServer(withoutMockCookies(jar.cookies), 'player')
  const options = {
    redirectTo: `${input.origin}/api/auth/google/callback`,
    skipBrowserRedirect: true,
    queryParams: { prompt: 'select_account' },
  }
  let url: string | null = null
  if (input.flow.intent === 'connect') {
    const { data: own } = await supabase.auth.getUserIdentities()
    for (const identity of own?.identities ?? []) {
      if (identity.provider !== 'google' || emailOf(identity) === (input.keepEmail ?? '')) continue
      await supabase.auth.unlinkIdentity(identity).catch(() => undefined)
    }
    const { data, error } = await supabase.auth.linkIdentity({ provider: 'google', options })
    url = error ? null : data.url
  } else {
    const { data, error } = await supabase.auth.signInWithOAuth({ provider: 'google', options })
    url = error ? null : data.url
  }
  if (!url) return null
  // A new trip replaces whatever an earlier one left behind.
  await dropPendingGoogle(jar)
  clearGoogleResult(jar)
  setCookie(jar, GOOGLE_FLOW_COOKIE, encode(input.flow))
  return url
}

export type GoogleExchange =
  | {
      ok: false
      /** `linked-here` / `linked-elsewhere`: Connect picked a Google account already on a login */
      reason: 'failed' | 'linked-here' | 'linked-elsewhere'
    }
  | {
      ok: true
      /** The provider user the session is for */
      subject: string
      google: VerifiedGoogle
      /** Every sign-in method on this provider user is Google: nothing but Google made it */
      googleOnly: boolean
      tokens: GoogleTokens
      /** Removes the Google identity just used from this provider user. Best effort. */
      unlinkUsed(): Promise<void>
      /** Removes this user's other Google identities (after Change). Best effort. */
      unlinkOthers(): Promise<void>
      /**
       * Finishes the callback's cookie work. `signIn: true` writes the session into the Player
       * sign-in cookie; `false` leaves that cookie exactly as it was. The PKCE cookies are always
       * cleared.
       */
      settle(signIn: boolean): void
    }

/**
 * Trades the callback's `code` for a provider session without signing anyone in: the session
 * cookies Supabase wants to write are captured, not sent. Missing, replayed, forged and
 * wrong-browser codes fail here (PKCE). An unverified Google email fails too.
 */
export async function exchangeGoogleCode(
  jar: GoogleCookies,
  params: { code: string | null; errorCode: string | null; errorDescription: string | null },
): Promise<GoogleExchange> {
  if (!params.code) {
    if (params.errorCode !== 'identity_already_exists') return { ok: false, reason: 'failed' }
    return {
      ok: false,
      reason: /another user/i.test(params.errorDescription ?? '')
        ? 'linked-elsewhere'
        : 'linked-here',
    }
  }
  const base = withoutMockCookies(jar.cookies)
  const captured: CookieToSet[] = []
  const supabase = createSupabaseServer(
    { getAll: () => base.getAll(), setAll: (values) => void captured.push(...values) },
    'player',
  )
  const sessionCookie = authCookieName('player')
  const isSessionCookie = (name: string) =>
    name === sessionCookie || /^\.\d+$/.test(name.slice(sessionCookie.length))
  const settle = (signIn: boolean) => {
    const writes = captured.filter(
      (cookie) =>
        cookie.name.startsWith(sessionCookie) && (signIn || !isSessionCookie(cookie.name)),
    )
    if (writes.length) base.setAll(writes, {})
  }
  const { data, error } = await supabase.auth.exchangeCodeForSession(params.code)
  if (error || !data.session || !data.user) {
    settle(false)
    return { ok: false, reason: 'failed' }
  }
  const tokens = {
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
  }
  const used = usedGoogleIdentity(data.user)
  if (!used) {
    await revokeSession(tokens.accessToken)
    settle(false)
    return { ok: false, reason: 'failed' }
  }
  const all = googleIdentities(data.user)
  return {
    ok: true,
    subject: data.user.id,
    google: used.google,
    googleOnly: (data.user.identities ?? []).length === all.length,
    tokens,
    unlinkUsed: async () => {
      await supabase.auth.unlinkIdentity(used.identity).catch(() => undefined)
    },
    unlinkOthers: async () => {
      for (const identity of all)
        if (identity.identity_id !== used.identity.identity_id)
          await supabase.auth.unlinkIdentity(identity).catch(() => undefined)
    },
    settle,
  }
}

/**
 * Ends the provider session a callback returned, unless it is the very session the player is
 * already signed in with (then it is theirs to keep).
 */
export async function dropGoogleSession(tokens: GoogleTokens, keepSessionId?: string | null) {
  const sessionId = sessionIdOf(tokens.accessToken)
  if (keepSessionId && sessionId === keepSessionId) return
  await revokeSession(tokens.accessToken)
}

/** Holds the provider session apart from the sign-in cookie until the player answers or registers. */
export function holdPendingGoogle(jar: GoogleCookies, tokens: GoogleTokens) {
  setCookie(jar, GOOGLE_PENDING_ACCESS_COOKIE, tokens.accessToken)
  setCookie(jar, GOOGLE_PENDING_REFRESH_COOKIE, tokens.refreshToken)
}

function clearPendingGoogle(jar: GoogleCookies) {
  setCookie(jar, GOOGLE_PENDING_ACCESS_COOKIE, '')
  setCookie(jar, GOOGLE_PENDING_REFRESH_COOKIE, '')
}

export type PendingGoogle = {
  subject: string
  google: VerifiedGoogle
  googleOnly: boolean
  tokens: GoogleTokens
}

/**
 * The held Google sign-in, verified with the provider on every read (`getUser` checks the token
 * and returns the provider's own user record). A missing, expired, revoked or edited cookie is null.
 */
export async function readPendingGoogle(jar: GoogleCookies): Promise<PendingGoogle | null> {
  const accessToken = readCookie(jar, GOOGLE_PENDING_ACCESS_COOKIE)
  const refreshToken = readCookie(jar, GOOGLE_PENDING_REFRESH_COOKIE)
  if (!accessToken || !refreshToken) return null
  const { data, error } = await plainClient().auth.getUser(accessToken)
  if (error || !data.user) return null
  const used = usedGoogleIdentity(data.user)
  if (!used) return null
  return {
    subject: data.user.id,
    google: used.google,
    googleOnly: (data.user.identities ?? []).length === googleIdentities(data.user).length,
    tokens: { accessToken, refreshToken },
  }
}

/** Forgets the held Google sign-in and ends its provider session. */
export async function dropPendingGoogle(jar: GoogleCookies) {
  const accessToken = readCookie(jar, GOOGLE_PENDING_ACCESS_COOKIE)
  if (accessToken) await revokeSession(accessToken)
  if (accessToken || readCookie(jar, GOOGLE_PENDING_REFRESH_COOKIE)) clearPendingGoogle(jar)
}

/**
 * Makes the held Google sign-in the Player session on this device (after ROTRA recorded the
 * connection or made the account). False when the provider no longer accepts it.
 */
export async function promotePendingGoogle(jar: GoogleCookies, pending: PendingGoogle) {
  const supabase = createSupabaseServer(withoutMockCookies(jar.cookies), 'player')
  const { data, error } = await supabase.auth.setSession({
    access_token: pending.tokens.accessToken,
    refresh_token: pending.tokens.refreshToken,
  })
  clearPendingGoogle(jar)
  return !error && data.user?.id === pending.subject
}

/** Signs this device out of the Player app (used when a just-promoted session maps to nothing). */
export async function signOutPlayerHere(jar: GoogleCookies) {
  await createSupabaseServer(withoutMockCookies(jar.cookies), 'player').auth.signOut({
    scope: 'local',
  })
}
