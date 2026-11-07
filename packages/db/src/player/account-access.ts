import 'server-only'
import { loadAccountContext, type PlayerContext } from '../auth/account-context'
import { MOCK_COOKIE_PREFIX } from '../auth/data-mode'
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

async function saveDetails(context: PlayerContext, details: ClaimDetails) {
  const current = await prisma.player.findUniqueOrThrow({
    where: { id: context.playerId },
    select: { avatarRef: true },
  })
  await updateMyProfile(context, {
    expectedRevision: (await readMyAccount(context)).revision,
    fullName: details.fullName,
    nickname: details.nickname,
    picture: current.avatarRef,
    playingStyle: details.playingStyle,
    experienceYears: details.experienceYears,
    experienceMonths: details.experienceMonths,
    socialLinks: details.socialLinks,
  })
}

/**
 * P-FORGOT. Sends the provider's recovery email only to a registered player's email, and answers
 * the same way whether or not one exists. The email links to `<redirectTo>/<token hash>`.
 */
export async function requestPasswordReset(
  cookies: CookieAdapter,
  email: string,
  redirectTo: string,
) {
  const address = email.trim().toLowerCase()
  if (!address.includes('@'))
    throw new ServiceError('invalid', { email: 'Enter an email address, like name@example.com.' })
  const contact = await prisma.playerPrivateContact.findUnique({
    where: { email: address },
    select: { player: { select: { account: { select: { disabledAt: true } } } } },
  })
  const account = contact?.player.account
  if (account && !account.disabledAt) {
    const supabase = createSupabaseServer(withoutMockCookies(cookies), 'player')
    const { error } = await supabase.auth.resetPasswordForEmail(address, { redirectTo })
    if (error) console.error('[password-reset] provider refused', error.status ?? 'unknown')
  }
  return { acknowledged: true }
}

/**
 * P-RESET. Verifies the recovery token (single use), checks it belongs to a player account, sets
 * the new password and signs out again: the player then signs in with the new password.
 */
export async function resetPassword(cookies: CookieAdapter, token: string, password: string) {
  if (!password) throw new ServiceError('invalid', { password: 'Enter a new password.' })
  const supabase = createSupabaseServer(withoutMockCookies(cookies), 'player')
  const { data, error } = await supabase.auth.verifyOtp({ type: 'recovery', token_hash: token })
  if (error || !data.user) {
    if (error?.status && error.status >= 500) throw new ServiceError('unavailable')
    throw new ServiceError('forbidden', { link: RESET_LINK })
  }
  const context = await loadAccountContext(
    { provider: AUTH_PROVIDER, subject: data.user.id },
    'player',
  )
  if (!context) {
    await supabase.auth.signOut({ scope: 'local' })
    throw new ServiceError('forbidden', { link: RESET_LINK })
  }
  const update = await supabase.auth.updateUser({ password })
  await supabase.auth.signOut({ scope: 'local' })
  if (update.error) {
    if (update.error.status && update.error.status >= 500) throw new ServiceError('unavailable')
    throw new ServiceError('invalid', {
      password: update.error.message || 'Choose a different password.',
    })
  }
  return { saved: true }
}
