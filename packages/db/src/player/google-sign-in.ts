import 'server-only'
import { PLAYER_GOOGLE_SIGN_IN_FLAG } from '@rotra/data/feature-flag/keys'
import { loadAccountContext } from '../auth/account-context'
import { dataMode } from '../auth/data-mode'
import {
  clearGoogleFlow,
  clearGoogleResult,
  currentPlayerSession,
  dropGoogleSession,
  dropPendingGoogle,
  exchangeGoogleCode,
  type GoogleCookies,
  type GoogleExchange,
  type GoogleResult,
  holdPendingGoogle,
  isGoogleFlowKey,
  isGoogleIntent,
  type PendingGoogle,
  promotePendingGoogle,
  readGoogleFlow,
  readGoogleResult,
  readPendingGoogle,
  safeReturnPath,
  startGoogleFlow,
  type VerifiedGoogle,
  writeGoogleResult,
} from '../auth/google-oauth'
import { AUTH_PROVIDER } from '../auth/supabase'
import {
  deleteOrphanGoogleLogin,
  emailHasOtherLogin,
  loginHasRotraAccount,
} from '../auth/supabase-provider-admin'
import { prisma } from '../client/prisma'
import { ServiceError } from '../service/errors'
import { type ClaimDetails, registerFromClaimWithGoogle } from './account-access'
import { readPlayerFeatureFlag } from './feature-flags'
import { clearGoogleGateHint } from './google-gate'
import { registerGuestWithGoogle } from './guest-registration'
import { readUnclaimedIdentities } from './unclaimed-identities'

/**
 * Google sign-in for players, real mode (D-2026-11-16-01, #922), behind `player_google_sign_in`.
 * The rules, all decided from ROTRA's own record (`player_accounts.google_email`):
 *
 * - Google is connected to an account only when that account's `google_email` says so. A Google
 *   identity the provider attached to a password login by itself (same verified email) is not a
 *   connection: the player is asked **Connect Google to your account?** first, every time, until
 *   they say yes. Declining or leaving signs nobody in (the held session never becomes the Player
 *   session, and `loadAccountContext` refuses an OAuth session for an account with no Google).
 * - A Google account with no ROTRA account never creates a player on `/login`. The login the
 *   provider made for it is deleted there; on an invite or a registration link it is held until
 *   the form is sent, and maps to no account (so it can't act as anyone) if the form never is.
 * - One Google email per ROTRA account, and never another account's ROTRA email.
 * - Connecting never changes the ROTRA email. There is no disconnect.
 */

const FAILED = "Couldn't finish with Google. Try again."
const failed = () => new ServiceError('invalid', { google: FAILED })
const takenMessage = (email: string) => `${email} is already used by another ROTRA account.`

const isUniqueViolation = (error: unknown) => (error as { code?: string })?.code === 'P2002'

/** Every Google Route Handler starts here: off (or mock mode) reads as a route that isn't there. */
export async function googleSignInEnabled() {
  return dataMode() === 'real' && (await readPlayerFeatureFlag(PLAYER_GOOGLE_SIGN_IN_FLAG))
}
async function requireGoogleSignIn() {
  if (!(await googleSignInEnabled())) throw new ServiceError('not_found')
}

/** The signed-in player on this request, with the provider session they are signed in with. */
async function currentPlayer(jar: GoogleCookies) {
  const session = await currentPlayerSession(jar)
  if (!session) return null
  const context = await loadAccountContext(
    { provider: AUTH_PROVIDER, subject: session.subject, oauth: session.oauth },
    'player',
  )
  return context ? { context, sessionId: session.sessionId } : null
}

async function accountOf(subject: string) {
  const account = await prisma.playerAccount.findUnique({
    where: { authProvider_authSubject: { authProvider: AUTH_PROVIDER, authSubject: subject } },
    select: {
      playerId: true,
      disabledAt: true,
      googleEmail: true,
      player: { select: { fullName: true, privateContact: { select: { email: true } } } },
    },
  })
  return account
    ? {
        playerId: account.playerId,
        disabled: account.disabledAt !== null,
        googleEmail: account.googleEmail,
        rotraEmail: account.player.privateContact?.email ?? null,
        name: account.player.fullName,
      }
    : null
}

/** Another account already has this email, as its connected Google or as its ROTRA email. */
async function googleEmailInUse(email: string, exceptPlayerId?: string) {
  const [connected, contact] = await Promise.all([
    prisma.playerAccount.findUnique({ where: { googleEmail: email }, select: { playerId: true } }),
    prisma.playerPrivateContact.findUnique({ where: { email }, select: { playerId: true } }),
  ])
  return [connected, contact].some((row) => row && row.playerId !== exceptPlayerId)
}

/** A held Google sign-in on a login nothing but Google made and no ROTRA account uses. */
async function isNewGoogle(pending: PendingGoogle) {
  return pending.googleOnly && !(await loginHasRotraAccount(pending.subject))
}

const sessionOf = (playerId: string, name: string) => ({
  account: { id: playerId, name, audience: 'player' as const },
})

/** Records Google on an account. False when another account already has this Google email. */
async function recordGoogle(playerId: string, email: string) {
  try {
    await prisma.playerAccount.update({
      where: { playerId },
      data: { googleEmail: email, googleLinkedAt: new Date(), revision: { increment: 1 } },
    })
    return true
  } catch (error) {
    if (isUniqueViolation(error)) return false
    throw error
  }
}

/**
 * POST start: where the browser should go for Google. `connect` needs a signed-in player (it adds
 * Google to their own login); the other intents are for visitors. Nothing is decided here.
 */
export async function startPlayerGoogle(
  jar: GoogleCookies,
  input: { intent: unknown; key: unknown; returnTo: unknown; origin: string },
) {
  await requireGoogleSignIn()
  if (!isGoogleIntent(input.intent) || !isGoogleFlowKey(input.key))
    throw new ServiceError('invalid')
  const flow = {
    intent: input.intent,
    key: input.key,
    returnTo: safeReturnPath(input.returnTo),
  }
  let keepEmail: string | null = null
  if (flow.intent === 'connect') {
    const me = await currentPlayer(jar)
    if (!me) throw new ServiceError('unauthenticated')
    keepEmail = (await accountOf(me.context.subject))?.googleEmail ?? null
  }
  const url = await startGoogleFlow(jar, { flow, origin: input.origin, keepEmail })
  if (!url) throw new ServiceError('unavailable')
  return { url }
}

type Decided = [outcome: GoogleResult['outcome'], google?: VerifiedGoogle]

/** Connect or Change Google while signed in: the provider added Google to the player's own login. */
async function decideConnect(jar: GoogleCookies, exchange: GoogleExchange): Promise<Decided> {
  const me = await currentPlayer(jar)
  if (!exchange.ok) {
    // Picked the Google account that is already connected: nothing to change.
    if (exchange.reason === 'linked-here' && me) {
      const connected = (await accountOf(me.context.subject))?.googleEmail
      if (connected) return ['connected', { email: connected, name: '' }]
    }
    return [exchange.reason === 'linked-elsewhere' ? 'taken' : 'failed']
  }
  const { google, tokens } = exchange
  const finish = async (outcome: GoogleResult['outcome']): Promise<Decided> => {
    // The player stays on the session they already had; the callback's own session is ended.
    await dropGoogleSession(tokens, me?.sessionId)
    exchange.settle(false)
    return [outcome, google]
  }
  if (!me || me.context.subject !== exchange.subject) return finish('failed')
  const inUse =
    (await googleEmailInUse(google.email, me.context.playerId)) ||
    (await emailHasOtherLogin(google.email, exchange.subject))
  if (inUse || !(await recordGoogle(me.context.playerId, google.email))) {
    await exchange.unlinkUsed()
    return finish('taken')
  }
  await exchange.unlinkOthers()
  clearGoogleGateHint(jar.cookies)
  return finish('connected')
}

/** Continue with Google on P-LOGIN, an invite or a registration link. */
async function decideSignIn(
  jar: GoogleCookies,
  intent: 'login' | 'register' | 'claim',
  exchange: GoogleExchange,
): Promise<Decided> {
  if (!exchange.ok) return ['failed']
  const { subject, google, tokens } = exchange
  const elsewhere = intent === 'login' ? 'not-connected' : 'taken'
  const refuse = async (outcome: GoogleResult['outcome']): Promise<Decided> => {
    await dropGoogleSession(tokens)
    exchange.settle(false)
    return [outcome, google]
  }
  const hold = (): Decided => {
    holdPendingGoogle(jar, tokens)
    exchange.settle(false)
    return ['held', google]
  }
  const account = await accountOf(subject)
  if (account) {
    if (account.disabled) return refuse('failed')
    // A registration link is for a profile with no account yet: an existing account's Google is taken.
    if (intent === 'claim') return refuse('taken')
    if (account.googleEmail === google.email) {
      exchange.settle(true)
      clearGoogleGateHint(jar.cookies)
      return ['signed-in', google]
    }
    // The provider attached this Google account by itself (same email): ask first, never sign in.
    if (account.rotraEmail === google.email) return hold()
    return refuse(elsewhere)
  }
  // A club's or Admin's login, or a login with a password: never a new player, never deleted.
  if (!exchange.googleOnly || (await loginHasRotraAccount(subject))) return refuse(elsewhere)
  if (intent === 'login' || (await googleEmailInUse(google.email))) {
    exchange.settle(false)
    // The login the provider just made for an unknown Google account is removed again.
    if (!(await deleteOrphanGoogleLogin(subject))) await dropGoogleSession(tokens)
    return [elsewhere, google]
  }
  return hold()
}

/**
 * GET callback: the provider sends the browser back here. Returns the same-app path to redirect to
 * (the screen that started it); the outcome waits in the result cookie, never in the URL. A
 * callback this browser did not start (no flow cookie) decides nothing.
 */
export async function handleGoogleCallback(
  jar: GoogleCookies,
  params: { code: string | null; errorCode: string | null; errorDescription: string | null },
) {
  const flow = readGoogleFlow(jar)
  clearGoogleFlow(jar)
  if (!flow) return '/login'
  let decided: Decided
  try {
    const exchange = await exchangeGoogleCode(jar, params)
    decided =
      flow.intent === 'connect'
        ? await decideConnect(jar, exchange)
        : await decideSignIn(jar, flow.intent, exchange)
  } catch (error) {
    console.error('[google-sign-in] callback', error instanceof Error ? error.name : typeof error)
    decided = ['failed']
  }
  const [outcome, google] = decided
  writeGoogleResult(jar, {
    key: flow.key,
    intent: flow.intent,
    outcome,
    email: google?.email ?? '',
    name: google?.name ?? '',
  })
  return flow.returnTo
}

/**
 * GET outcome: is a Google result waiting, and for which screen? The Google name and email are for
 * display. A failed trip is reported once and forgotten here.
 */
export async function peekGoogleReturn(jar: GoogleCookies) {
  await requireGoogleSignIn()
  const result = readGoogleResult(jar)
  if (!result) return { waiting: null }
  if (result.outcome === 'failed') {
    clearGoogleResult(jar)
    return { waiting: { key: result.key, failed: FAILED } }
  }
  return { waiting: { key: result.key, google: { email: result.email, name: result.name } } }
}

/**
 * POST outcome: what the callback decided, in the shapes the screens already read
 * (`GoogleSignInOutcome`, `ConnectGoogleOutcome`). Read once. Anything that grants something is
 * checked again here against the session or the held Google sign-in, not taken from the cookie.
 */
export async function readGoogleOutcome(jar: GoogleCookies) {
  await requireGoogleSignIn()
  const result = readGoogleResult(jar)
  clearGoogleResult(jar)
  if (!result) throw failed()
  const google = { email: result.email, name: result.name }
  switch (result.outcome) {
    case 'signed-in': {
      const me = await currentPlayer(jar)
      const account = me ? await accountOf(me.context.subject) : null
      if (!account) throw failed()
      return { outcome: 'signed-in', google, session: sessionOf(account.playerId, account.name) }
    }
    case 'held': {
      const pending = await readPendingGoogle(jar)
      if (!pending) throw failed()
      const account = await accountOf(pending.subject)
      if (!account) {
        if (!(await isNewGoogle(pending))) throw failed()
        // Clubs saved this verified Google email as an unclaimed player (D-2026-11-16-04): the
        // identity cards, so registering keeps the RTR ID and joins every club's record.
        return {
          outcome: 'new-account',
          google: pending.google,
          unclaimed: await readUnclaimedIdentities(pending.google.email),
        }
      }
      if (account.disabled || account.rotraEmail !== pending.google.email) throw failed()
      return {
        outcome: 'ask-to-connect',
        google: pending.google,
        playerId: account.playerId,
        playerName: account.name,
      }
    }
    case 'not-connected':
      return { outcome: 'not-connected', triedEmail: result.email }
    case 'taken':
      return { outcome: 'taken', email: result.email }
    case 'connected':
      return { outcome: 'connected' }
    default:
      throw failed()
  }
}

/**
 * P-GOOGLE-LINK **Connect Google and sign in**: the player's one yes. Only the account whose ROTRA
 * email is the held Google email can be asked; Google is recorded on it, then the held session
 * becomes the Player session. The ROTRA email is not touched.
 */
export async function confirmGoogleLink(
  jar: GoogleCookies,
  input: { playerId: unknown; googleEmail: unknown },
) {
  await requireGoogleSignIn()
  const pending = await readPendingGoogle(jar)
  if (!pending) throw failed()
  const account = await accountOf(pending.subject)
  const email = typeof input.googleEmail === 'string' ? input.googleEmail.trim().toLowerCase() : ''
  if (
    !account ||
    account.disabled ||
    account.playerId !== input.playerId ||
    account.rotraEmail !== pending.google.email ||
    email !== pending.google.email
  )
    throw new ServiceError('forbidden', { google: "This Google account can't be connected here." })
  if (!(await recordGoogle(account.playerId, email)))
    throw new ServiceError('conflict', { google: takenMessage(email) })
  if (!(await promotePendingGoogle(jar, pending))) throw failed()
  clearGoogleResult(jar)
  clearGoogleGateHint(jar.cookies)
  return { session: sessionOf(account.playerId, account.name) }
}

/**
 * Google registration from a club or session invite, or the Admin link (`clubId` null: the player
 * picks a city or province, `cityCode`, and joins no club). The Google account comes from the held
 * sign-in (never from the request body), on a login with no ROTRA account. `account-match` when the
 * phone or the Google email already belongs to an account: nothing is created, and the held
 * sign-in stays so the player can correct the phone.
 */
export async function registerWithGoogle(
  jar: GoogleCookies,
  clubId: string | null,
  input: {
    phoneE164: string
    details: ClaimDetails
    identityRecordId?: string | null
    cityCode?: string | null
  },
  sessionSlug?: string | null,
  inviteCode?: string | null,
) {
  await requireGoogleSignIn()
  const pending = await readPendingGoogle(jar)
  if (!pending || !(await isNewGoogle(pending))) throw failed()
  const result = await registerGuestWithGoogle(jar, clubId, pending, input, sessionSlug, inviteCode)
  if (result.status === 'registered') clearGoogleResult(jar)
  return result
}

/**
 * The identity cards for the held Google sign-in's verified email (`getUnclaimedIdentities`,
 * D-2026-11-16-04): only for the Google account the callback verified, never an email from the
 * request, and only while that login has no ROTRA account. Null when no club saved the email.
 */
export async function readHeldUnclaimedIdentities(jar: GoogleCookies, typed: string) {
  await requireGoogleSignIn()
  const pending = await readPendingGoogle(jar)
  if (!pending || pending.google.email !== typed.trim().toLowerCase()) return null
  if (await accountOf(pending.subject)) return null
  return readUnclaimedIdentities(pending.google.email)
}

/**
 * P-CLAIM with Google instead of a password. `taken` when the Google email is already on another
 * ROTRA account (or its login is someone's): nothing changes and the held sign-in is dropped, so
 * the player picks another Google account.
 */
export async function claimWithGoogle(
  jar: GoogleCookies,
  token: string,
  input: { phoneE164?: string; details: ClaimDetails },
) {
  await requireGoogleSignIn()
  const result = readGoogleResult(jar)
  const pending = await readPendingGoogle(jar)
  const taken = async (email: string) => {
    await dropPendingGoogle(jar)
    clearGoogleResult(jar)
    return { outcome: 'taken' as const, email }
  }
  if (!pending) {
    // The callback already found this Google account on another account.
    if (result?.intent === 'claim' && result.outcome === 'taken') return taken(result.email)
    throw failed()
  }
  if (!(await isNewGoogle(pending))) return taken(pending.google.email)
  try {
    const claimed = await registerFromClaimWithGoogle(jar, token, pending, input)
    clearGoogleResult(jar)
    return { outcome: 'claimed' as const, ...claimed }
  } catch (error) {
    const emailUsed =
      isUniqueViolation(error) ||
      (error instanceof ServiceError && error.code === 'conflict' && Boolean(error.fields?.email))
    if (emailUsed) return taken(pending.google.email)
    throw error
  }
}
