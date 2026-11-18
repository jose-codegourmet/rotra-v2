import 'server-only'
import { consumeReviewedResetToken } from '../admin/password-resets'
import { loadAccountContext, type PlayerContext } from '../auth/account-context'
import { MOCK_COOKIE_PREFIX } from '../auth/data-mode'
import {
  type GoogleCookies,
  type PendingGoogle,
  promotePendingGoogle,
  signOutPlayerHere,
} from '../auth/google-oauth'
import { AUTH_PROVIDER, type CookieAdapter, createSupabaseServer } from '../auth/supabase'
import { supabaseProviderAdmin } from '../auth/supabase-provider-admin'
import { prisma } from '../client/prisma'
import type { SocialProvider } from '../generated/prisma/client'
import { ServiceError } from '../service/errors'
import { completeClaim } from './claim'
import { readMyAccount, updateMyProfile } from './profile'

const CREDENTIALS = "That email and password don't match. Check them and try again."
const RESET_LINK = 'This reset link has expired or was already used.'

function withoutMockCookies(cookies: CookieAdapter): CookieAdapter {
  return {
    getAll: () => cookies.getAll().filter((cookie) => !cookie.name.startsWith(MOCK_COOKIE_PREFIX)),
    setAll: (values, headers) => cookies.setAll(values, headers),
  }
}

/** Personal details the registration form sends with the email and password. */
export type ClaimDetails = {
  fullName: string
  nickname: string | null
  playingStyle: string
  experienceYears: number | null
  experienceMonths: number | null
  socialLinks: Partial<Record<SocialProvider, string>>
}

/**
 * P-CLAIM submit. Creates the email + password login and claims the profile (`completeClaim`),
 * signs the player in on this device, then saves the personal details from the form. A retry after
 * success signs in again and returns the same result; it never creates a second login.
 */
export async function registerFromClaim(
  cookies: CookieAdapter,
  token: string,
  input: { email: string; password: string; phoneE164?: string; details: ClaimDetails },
) {
  const email = input.email.trim().toLowerCase()
  if (!email.includes('@'))
    throw new ServiceError('invalid', { email: 'Enter an email address, like name@example.com.' })
  if (!input.password) throw new ServiceError('invalid', { password: 'Enter a password.' })
  const result = await completeClaim(supabaseProviderAdmin(), {
    token,
    email,
    password: input.password,
    phoneE164: input.phoneE164,
  })
  const supabase = createSupabaseServer(withoutMockCookies(cookies), 'player')
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: input.password,
  })
  if (error || !data.user) {
    if (error?.status && error.status >= 500) throw new ServiceError('unavailable')
    throw new ServiceError('invalid', { email: CREDENTIALS })
  }
  const context = await loadAccountContext(
    { provider: AUTH_PROVIDER, subject: data.user.id },
    'player',
  )
  if (!context || context.playerId !== result.playerId) {
    await supabase.auth.signOut({ scope: 'local' })
    throw new ServiceError('conflict')
  }
  await saveDetails(context, input.details)
  const player = await prisma.player.findUniqueOrThrow({
    where: { id: result.playerId },
    select: { fullName: true, nickname: true },
  })
  return {
    ...result,
    firstName: player.nickname || player.fullName.split(' ')[0] || player.fullName,
    session: { account: { id: result.playerId, name: player.fullName, audience: 'player' } },
  }
}

/**
 * P-CLAIM submit with Google instead of a password (P12, #922), also the last step of Google
 * registration. `pending` is the Google sign-in the callback held, already verified with the
 * provider by the caller: its login becomes the account's login (`completeClaim` with
 * `googleSubject`), the Google email becomes the confirmed ROTRA email, and Google is recorded as
 * connected. Only then is the held session made the Player session on this device. A link another
 * login already used maps to no account for this one, so it is signed out again and refused.
 */
export async function registerFromClaimWithGoogle(
  jar: GoogleCookies,
  token: string,
  pending: PendingGoogle,
  input: { phoneE164?: string; details: ClaimDetails },
) {
  const result = await completeClaim(supabaseProviderAdmin(), {
    token,
    email: pending.google.email,
    googleSubject: pending.subject,
    phoneE164: input.phoneE164,
  })
  if (!(await promotePendingGoogle(jar, pending))) throw new ServiceError('unavailable')
  const context = await loadAccountContext(
    { provider: AUTH_PROVIDER, subject: pending.subject, oauth: true },
    'player',
  )
  if (!context || context.playerId !== result.playerId) {
    await signOutPlayerHere(jar)
    throw new ServiceError('conflict')
  }
  await saveDetails(context, input.details)
  const player = await prisma.player.findUniqueOrThrow({
    where: { id: result.playerId },
    select: { fullName: true, nickname: true },
  })
  return {
    ...result,
    firstName: player.nickname || player.fullName.split(' ')[0] || player.fullName,
    session: { account: { id: result.playerId, name: player.fullName, audience: 'player' } },
  }
}

async function saveDetails(context: PlayerContext, details: ClaimDetails) {
  await updateMyProfile(context, {
    expectedRevision: (await readMyAccount(context)).revision,
    fullName: details.fullName,
    nickname: details.nickname,
    playingStyle: details.playingStyle,
    experienceYears: details.experienceYears,
    experienceMonths: details.experienceMonths,
    socialLinks: details.socialLinks,
  })
}

/**
 * P-RESET. Verifies the recovery token (single use), checks it belongs to a player account, sets
 * the new password and signs out again: the player then signs in with the new password.
 */
export async function resetPassword(_cookies: CookieAdapter, token: string, password: string) {
  if (!password) throw new ServiceError('invalid', { password: 'Enter a new password.' })
  const reviewed = await consumeReviewedResetToken(token)
  // Recovery credentials stay server-side; failed verification never signs the browser in.
  let recoveryCookies: ReturnType<CookieAdapter['getAll']> = []
  const supabase = createSupabaseServer(
    {
      getAll: () => recoveryCookies,
      setAll: (values) => {
        recoveryCookies = values
      },
    },
    'player',
  )
  const { data, error } = await supabase.auth.verifyOtp({ type: 'recovery', token_hash: token })
  if (error || !data.user) {
    if (error?.status && error.status >= 500)
      throw new ServiceError('unavailable', {
        link: 'The reset could not be completed. Request another reset link.',
      })
    throw new ServiceError('forbidden', { link: RESET_LINK })
  }
  const context = await loadAccountContext(
    { provider: AUTH_PROVIDER, subject: data.user.id },
    'player',
  )
  if (!context || context.playerId !== reviewed.playerId || data.user.id !== reviewed.authSubject) {
    await supabase.auth.signOut({ scope: 'local' })
    throw new ServiceError('forbidden', { link: RESET_LINK })
  }
  const update = await supabase.auth.updateUser({ password })
  await supabase.auth.signOut({ scope: 'local' })
  if (update.error) {
    if (update.error.status && update.error.status >= 500)
      throw new ServiceError('unavailable', {
        link: 'The reset could not be completed. Request another reset link.',
      })
    throw new ServiceError('invalid', {
      link: 'Your password was not accepted. Request another reset link and choose a different password.',
    })
  }
  return { saved: true }
}
