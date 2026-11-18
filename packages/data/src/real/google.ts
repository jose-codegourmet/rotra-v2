import type { MockSession } from '../auth/auth.types'
import { GOOGLE_RETURN_COOKIE } from '../google-sign-in/googleSignIn.config'
import type {
  GoogleClaimResult,
  GoogleIdentity,
  GoogleRedirectIntent,
  GoogleRegistrationInput,
  GoogleRegistrationResult,
  InviteLanding,
  InviteLink,
} from '../google-sign-in/googleSignIn.types'
import { MockError } from '../mock/errors'
import type { UnclaimedIdentities } from '../player-account/unclaimedIdentity'
import { realRequest } from './client'

// Google sign-in in real mode (#922): the Player app's own Route Handlers over Supabase Auth. The
// Google account is never sent from here: the server holds the one the OAuth callback verified.

const FAILED = "Couldn't finish with Google. Try again."

/** What the OAuth callback decided, as `POST /api/auth/google/outcome` answers it (read once). */
export type RealGoogleOutcome =
  | { outcome: 'signed-in'; session: MockSession; google: GoogleIdentity }
  | { outcome: 'ask-to-connect'; google: GoogleIdentity; playerId: string; playerName: string }
  | { outcome: 'not-connected'; triedEmail: string }
  | {
      outcome: 'new-account'
      google: GoogleIdentity
      /** Clubs saved this verified Google email (D-2026-11-16-04, P15.8); null when none did */
      unclaimed?: UnclaimedIdentities | null
    }
  | { outcome: 'taken'; email: string }
  | { outcome: 'connected' }

/**
 * Sends the browser to Google. `key` names the screen that asked, so it can pick the result up when
 * the browser comes back to `returnTo` (a path in this app). The promise never settles on success:
 * the page is leaving.
 */
export async function realStartGoogle(input: {
  intent: GoogleRedirectIntent
  key: string
  returnTo: string
}): Promise<never> {
  const { url } = await realRequest<{ url: string }>('/api/auth/google/start', {
    method: 'POST',
    body: input,
  })
  window.location.assign(url)
  return new Promise<never>(() => undefined)
}

/**
 * True once, when the browser just came back from Google for this screen: reads the marker cookie
 * (a screen key, nothing else) and removes it, so a reload or a second listener doesn't repeat it.
 */
export function takeGoogleReturn(key: string) {
  if (typeof document === 'undefined') return false
  const waiting = document.cookie
    .split('; ')
    .find((cookie) => cookie.startsWith(`${GOOGLE_RETURN_COOKIE}=`))
    ?.slice(GOOGLE_RETURN_COOKIE.length + 1)
  if (waiting !== key) return false
  // biome-ignore lint/suspicious/noDocumentCookie: removes the page-readable marker (a screen key only)
  document.cookie = `${GOOGLE_RETURN_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`
  return true
}

/** The Google account to show for the result that is waiting, or why the trip failed. */
export async function realPeekGoogleReturn(key: string): Promise<GoogleIdentity> {
  const { waiting } = await realRequest<{
    waiting: { key: string; google?: GoogleIdentity; failed?: string } | null
  }>('/api/auth/google/outcome')
  if (!waiting || waiting.key !== key || !waiting.google)
    throw new MockError('retryable', waiting?.failed ?? FAILED)
  return waiting.google
}

export async function realReadGoogleOutcome() {
  return realRequest<RealGoogleOutcome>('/api/auth/google/outcome', { method: 'POST', body: {} })
}

export function realConfirmGoogleLink(input: { playerId: string; googleEmail: string }) {
  return realRequest<{ session: MockSession }>('/api/auth/google/link', {
    method: 'POST',
    body: input,
  })
}

const number = (typed: string) => (typed ? Number(typed) : null)

/** Club and session invites only; the Admin link (no club) isn't connected to saved data yet. */
export async function realRegisterWithGoogle(
  input: GoogleRegistrationInput & { clubId: string },
): Promise<GoogleRegistrationResult> {
  const search = new URLSearchParams()
  if (input.sessionSlug) search.set('session', input.sessionSlug)
  if (input.clubInviteCode) search.set('k', input.clubInviteCode)
  const query = search.toString()
  const result = await realRequest<
    | { status: 'account-match' }
    | ({ status: 'registered' } & Omit<
        Extract<GoogleRegistrationResult, { outcome: 'registered' }>,
        'outcome'
      >)
  >(`/api/register/${encodeURIComponent(input.clubId)}/google${query ? `?${query}` : ''}`, {
    method: 'POST',
    body: { values: input.values, identityRecordId: input.identityRecordId ?? null },
    fields: { experience: 'experienceYears' },
  })
  if (result.status === 'account-match') return { outcome: 'account-match' }
  const { status: _status, ...registered } = result
  return { outcome: 'registered', ...registered }
}

export function realCompleteClaimWithGoogle(input: {
  token: string
  values: {
    fullName: string
    nickname: string
    playingStyle: string
    experienceYears: string
    experienceMonths: string
    facebook: string
    instagram: string
    youtube: string
    linkedin: string
    phone?: string
  }
}) {
  const { values } = input
  return realRequest<GoogleClaimResult>(`/api/claim/${encodeURIComponent(input.token)}/google`, {
    method: 'POST',
    body: {
      phone: values.phone,
      fullName: values.fullName,
      nickname: values.nickname,
      playingStyle: values.playingStyle,
      experienceYears: number(values.experienceYears),
      experienceMonths: number(values.experienceMonths),
      socialLinks: {
        facebook: values.facebook,
        instagram: values.instagram,
        youtube: values.youtube,
        linkedin: values.linkedin,
      },
    },
    fields: { experience: 'experienceYears' },
  })
}

/** The invite card and the viewer's standing, for a club or session link. */
export function realGetInviteLanding(link: InviteLink & { clubId: string }, signal?: AbortSignal) {
  const search = new URLSearchParams()
  if (link.sessionSlug) search.set('session', link.sessionSlug)
  if (link.clubInviteCode) search.set('k', link.clubInviteCode)
  const query = search.toString()
  return realRequest<InviteLanding>(
    `/api/invites/${encodeURIComponent(link.clubId)}${query ? `?${query}` : ''}`,
    { signal },
  )
}

/**
 * `getUnclaimedIdentities` in real mode (P15.8): the identity cards for the Google account the
 * callback verified and holds; the server answers null for any other email.
 */
export async function realGetUnclaimedIdentities(googleEmail: string, signal?: AbortSignal) {
  const { unclaimed } = await realRequest<{
    unclaimed: UnclaimedIdentities | null
  }>(`/api/auth/google/unclaimed?email=${encodeURIComponent(googleEmail)}`, { signal })
  return unclaimed
}
