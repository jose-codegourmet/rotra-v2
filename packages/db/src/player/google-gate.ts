import 'server-only'
import { PLAYER_GOOGLE_SIGN_IN_FLAG } from '@rotra/data/feature-flag/keys'
import { GOOGLE_SIGN_IN_DEADLINE } from '@rotra/data/google-sign-in/config'
import { isGoogleDeadlinePassed } from '@rotra/data/google-sign-in/rules'
import type { PlayerContext } from '../auth/account-context'
import { GOOGLE_GATE_COOKIE } from '../auth/google-cookies'
import { AUTH_PROVIDER, type CookieAdapter } from '../auth/supabase'
import { prisma } from '../client/prisma'
import { readPlayerFeatureFlag } from './feature-flags'

/** Shown by a refused Route Handler; the app sends the player to `/connect-google` by itself. */
export const GOOGLE_REQUIRED = 'Connect a Google account to keep using ROTRA.'

const deadlinePassed = () => isGoogleDeadlinePassed(GOOGLE_SIGN_IN_DEADLINE.date)

/**
 * The deadline gate (D-2026-11-16-01): after the deadline (the one shared value in
 * `googleSignIn.config.ts`), with `player_google_sign_in` on, a player with no Google account may
 * only connect Google or sign out. The flag is read only once the deadline has passed and the
 * player has no Google, so nothing changes before then or while the flag is off.
 */
export async function googleRequiredFor(context: PlayerContext) {
  if (context.googleConnected || !deadlinePassed()) return false
  return readPlayerFeatureFlag(PLAYER_GOOGLE_SIGN_IN_FLAG)
}

const gateCookie = (value: string, maxAge: number) => ({
  name: GOOGLE_GATE_COOKIE,
  value,
  options: { path: '/', sameSite: 'lax' as const, httpOnly: true, maxAge },
})

export function clearGoogleGateHint(cookies: CookieAdapter) {
  if (cookies.getAll().some((cookie) => cookie.name === GOOGLE_GATE_COOKIE))
    cookies.setAll([gateCookie('', 0)], {})
}

/**
 * Keeps `proxy.ts`'s navigation hint in step with the facts, on the session read and the password
 * sign-in: set while this login's player has no Google account and the flag is on, cleared
 * otherwise. Before the deadline it only clears a leftover hint (no database read at all).
 */
export async function syncGoogleGateHint(cookies: CookieAdapter, subject: string | null) {
  let required = false
  if (subject && deadlinePassed()) {
    const account = await prisma.playerAccount.findUnique({
      where: { authProvider_authSubject: { authProvider: AUTH_PROVIDER, authSubject: subject } },
      select: { googleEmail: true, disabledAt: true },
    })
    required =
      !!account &&
      !account.disabledAt &&
      !account.googleEmail &&
      (await readPlayerFeatureFlag(PLAYER_GOOGLE_SIGN_IN_FLAG))
  }
  if (required) cookies.setAll([gateCookie('1', 86_400)], {})
  else clearGoogleGateHint(cookies)
}
