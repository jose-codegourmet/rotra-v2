import { emailField } from '@rotra/schema/email'
import { passwordField } from '@rotra/schema/password'
import { type PersonalProfileValues, personalProfileSchema } from '@rotra/schema/personal-details'
import { phoneField } from '@rotra/schema/phone'
import { getSession, signIn } from '../auth/fetchers'
import { getConnectivity } from '../connectivity/connectivity'
import { PLAYER_GOOGLE_SIGN_IN_FLAG } from '../feature-flag/featureFlag.keys'
import { isMockFlagOn } from '../feature-flag/mockFlagOverride'
import { claimLinkScenarios } from '../fixtures/playerAccounts'
import { playerRequest } from '../leaderboard/request'
import { checkMockSave } from '../mock/bridge'
import { MockError } from '../mock/errors'
import { delay } from '../mock/latency'
import { mockStore, readMockState } from '../mock/store'
import { submitMockPasswordReset } from '../password-reset/fetchers'
import { applyPersonalProfile } from '../player/fetchers'
import { isRealDataMode } from '../real/mode'
import {
  realCompleteClaim,
  realGetClaimLink,
  realGetMyAccount,
  realRequestPasswordReset,
  realResetPassword,
  realSetPhonePrivacy,
} from '../real/player'
import { maskPhone } from './playerAccount.rules'
import type { ClaimLink, CompleteClaimResult, MyAccount } from './playerAccount.types'
import { joinClubRecords } from './unclaimedIdentity'
import { myAccountOf } from './visibilitySettings'

/** The signed-in player's own contacts; null when signed out. Never a public fetcher. */
export async function getMyAccount(signal?: AbortSignal): Promise<MyAccount | null> {
  if (isRealDataMode()) return realGetMyAccount(signal)
  await playerRequest(signal)
  const session = await getSession('player')
  return session ? myAccountOf(readMockState(), session.account.id) : null
}

/**
 * Same acknowledgement for known and unknown emails. No email is delivered in the mock. An account
 * that signs in with Google and has no password (P12) answers `signsInWithGoogle` instead, and no
 * Admin review request is made for it.
 */
export async function requestPasswordReset(
  email: string,
): Promise<{ acknowledged: boolean; signsInWithGoogle?: boolean }> {
  if (isRealDataMode()) return realRequestPasswordReset(emailField.parse(email))
  await delay(400)
  if (getConnectivity() === 'offline')
    throw new MockError(
      'offline',
      "Couldn't send because you're offline. Try again when you're connected.",
    )
  const address = emailField.parse(email)
  const googleOnly =
    isMockFlagOn(PLAYER_GOOGLE_SIGN_IN_FLAG) &&
    readMockState().playerAccounts.some(
      (a) =>
        a.claimed &&
        a.email.toLowerCase() === address.toLowerCase() &&
        !!a.googleEmail &&
        a.hasPassword === false,
    )
  if (googleOnly) return { acknowledged: true, signsInWithGoogle: true }
  submitMockPasswordReset(address)
  return { acknowledged: true }
}
/** Real mode can't check a recovery token without using it up, so the form opens and submit decides. */
export async function getResetLink(token: string, signal?: AbortSignal) {
  if (isRealDataMode()) return { token, status: 'valid' as const }
  await delay(200, signal)
  if (getConnectivity() === 'offline')
    throw new MockError('offline', "You're offline. Reconnect to check this reset link.")
  const status = readMockState().resetLinks[token]
  return { token, status: status === 'valid' ? ('valid' as const) : ('invalid' as const) }
}
/** Simulate consuming a reset link. Passwords are validated but never retained or returned. */
export async function resetPassword({ token, password }: { token: string; password: string }) {
  if (isRealDataMode()) return realResetPassword({ token, password: passwordField.parse(password) })
  await delay(400)
  if (getConnectivity() === 'offline')
    throw new MockError(
      'offline',
      "Couldn't save because you're offline. Try again when you're connected.",
    )
  passwordField.parse(password)
  checkMockSave()
  mockStore.update((draft) => {
    if (draft.resetLinks[token] !== 'valid')
      throw new MockError('permission', 'This reset link has expired or was already used.')
    draft.resetLinks[token] = 'used'
  })
  return { saved: true }
}

const CLAIM_OFFLINE =
  "You're offline, so registration wasn't sent. Your details are still here; try again when you're connected."
const EMAIL_CONFLICT =
  'This email belongs to another ROTRA account. Use a different email, or ask ROTRA for help.'

/** A registration link as its recipient may see it; unknown tokens are null (shown as expired). */
export async function getClaimLink(token: string, signal?: AbortSignal): Promise<ClaimLink | null> {
  if (isRealDataMode()) return realGetClaimLink(token, signal)
  await delay(300, signal)
  if (getConnectivity() === 'offline')
    throw new MockError('offline', "You're offline. Reconnect to open this registration link.")
  const state = readMockState()
  const record = state.claimLinks[token]
  const profile = record && state.playerProfiles.find((p) => p.playerId === record.playerId)
  const account = record && state.playerAccounts.find((a) => a.playerId === record.playerId)
  if (!record || !profile || !account) return null
  return {
    token,
    status:
      record.expiresAt && Date.parse(record.expiresAt) <= Date.now()
        ? 'expired'
        : record.status === 'valid' && account.claimed
          ? 'claimed'
          : record.status,
    clubName: record.clubName,
    preview: {
      playerId: profile.playerId,
      fullName: profile.fullName,
      nickname: profile.nickname,
      rtrId: profile.rtrId,
      picture: profile.picture,
      // An unclaimed player has no account phone: the form then asks for one.
      maskedPhone: account.phone ? maskPhone(account.phone) : '',
    },
    preset: {
      fullName: profile.fullName,
      nickname: profile.nickname ?? '',
      email: account.email,
      playingStyle: profile.playingStyle,
      experienceYears: profile.experienceYears == null ? '' : String(profile.experienceYears),
      experienceMonths: profile.experienceMonths == null ? '' : String(profile.experienceMonths),
      facebook: profile.socialLinks.facebook,
      instagram: profile.socialLinks.instagram,
      youtube: profile.socialLinks.youtube,
      linkedin: profile.socialLinks.linkedin,
    },
  }
}

export type CompleteClaimInput = {
  token: string
  /** `phone` only when the profile has none on file: an unclaimed player a club saved by email. */
  values: PersonalProfileValues & { email: string; password: string; phone?: string }
}
/**
 * Registers the linked profile: sets email and personal details and marks it claimed. Without
 * changes it only closes the link, for a profile that is already registered.
 */
export function finishClaim(
  token: string,
  changes?: { email: string; personal: PersonalProfileValues; phone?: string },
) {
  let result: CompleteClaimResult | undefined
  mockStore.update((draft) => {
    const record = draft.claimLinks[token]
    const account = record && draft.playerAccounts.find((a) => a.playerId === record.playerId)
    const profile = record && draft.playerProfiles.find((p) => p.playerId === record.playerId)
    if (
      !record ||
      !account ||
      !profile ||
      record.status === 'expired' ||
      (record.expiresAt && Date.parse(record.expiresAt) <= Date.now())
    )
      throw new MockError('permission', 'The registration link has expired or was replaced.')
    if (changes) {
      applyPersonalProfile(profile, changes.personal)
      account.email = changes.email
      if (changes.phone && !account.phone) account.phone = changes.phone
      account.claimed = true
      // Every club's record of the person joins the account with it (D-2026-11-16-04).
      joinClubRecords(draft, account.playerId)
    }
    record.status = 'valid'
    result = {
      playerId: profile.playerId,
      rtrId: profile.rtrId,
      firstName: profile.nickname || profile.fullName.split(' ')[0] || profile.fullName,
    }
  })
  if (!result) throw new Error('Registration produced no result.')
  return result
}

/**
 * Completes registration from a link. A retry after success returns the same result instead of
 * creating anything new; the password is checked and then discarded, never stored.
 */
export async function completeClaim({ token, values }: CompleteClaimInput) {
  if (isRealDataMode()) return realCompleteClaim({ token, values })
  await delay(1100)
  if (getConnectivity() === 'offline') throw new MockError('offline', CLAIM_OFFLINE)
  const { email: rawEmail, password, phone: rawPhone, ...rest } = values
  const personal = personalProfileSchema.parse(rest)
  const email = emailField.parse(rawEmail)
  passwordField.parse(password)
  // Taken only when the profile has no phone on file (an unclaimed player a club saved by email).
  const phone = rawPhone?.trim() ? phoneField.safeParse(rawPhone) : null
  if (phone && !phone.success) {
    const text = 'Enter a Philippine mobile number, like 0917 555 0142.'
    throw new MockError('conflict', text, { phone: text })
  }
  const state = readMockState()
  const record = state.claimLinks[token]
  const account = record && state.playerAccounts.find((a) => a.playerId === record.playerId)
  if (
    !record ||
    !account ||
    record.status === 'expired' ||
    (record.expiresAt && Date.parse(record.expiresAt) <= Date.now())
  )
    throw new MockError('permission', 'The registration link has expired or was replaced.')
  const conflict = state.playerAccounts.some(
    (other) =>
      other.playerId !== account.playerId && other.email.toLowerCase() === email.toLowerCase(),
  )
  if (conflict) throw new MockError('conflict', EMAIL_CONFLICT, { email: EMAIL_CONFLICT })
  if (account.claimed && account.email.toLowerCase() !== email.toLowerCase())
    throw new MockError(
      'permission',
      "This link was already used to finish registering. It can't create another account.",
    )
  checkMockSave()
  const result = finishClaim(token, {
    email: account.claimed ? account.email : email,
    personal,
    phone: phone?.success ? phone.data : undefined,
  })
  const session = await signIn('player', { identifier: email, password })
  return { ...result, session }
}

/** Processing links: the first check is still processing, the second completes (prototype). */
export async function checkClaimStatus(token: string) {
  await delay(600)
  if (getConnectivity() === 'offline')
    throw new MockError('offline', "You're offline. Reconnect to check your registration.")
  let checks = 0
  mockStore.update((draft) => {
    const record = draft.claimLinks[token]
    if (record?.status === 'processing') checks = ++record.checks
  })
  if (checks === 0) throw new MockError('permission', 'This registration is not being set up.')
  if (checks < 2) return { status: 'processing' as const }
  const link = await getClaimLink(token)
  if (!link) throw new MockError('permission', 'The registration link has expired or was replaced.')
  const account = readMockState().playerAccounts.find((a) => a.playerId === link.preview.playerId)
  // Already registered: finishing the setup never overwrites the details the player chose.
  const email = account?.claimed ? account.email : claimLinkScenarios.processingEmail
  const result = finishClaim(
    token,
    account?.claimed ? undefined : { email, personal: personalDetailsFromPreset(link.preset) },
  )
  // The mock has no password to check here; the registration it completes already set one.
  const session = await signIn('player', { identifier: email, password: 'already-set' })
  return { status: 'done' as const, ...result, session }
}
function personalDetailsFromPreset(preset: ClaimLink['preset']): PersonalProfileValues {
  return {
    fullName: preset.fullName,
    nickname: preset.nickname,
    playingStyle: preset.playingStyle,
    experienceYears: preset.experienceYears,
    experienceMonths: preset.experienceMonths,
    facebook: preset.facebook,
    instagram: preset.instagram,
    youtube: preset.youtube,
    linkedin: preset.linkedin,
  }
}

/** Sets phoneHidden for the signed-in player. Offline leaves the stored value as it was. */
export async function setPhonePrivacy(input: { phoneHidden: boolean }): Promise<MyAccount> {
  if (isRealDataMode()) return realSetPhonePrivacy(input)
  await delay(900)
  const session = await getSession('player')
  if (!session) throw new MockError('permission', 'Sign in to change your phone privacy.')
  const stored = readMockState().playerAccounts.find((a) => a.playerId === session.account.id)
  if (!stored) throw new MockError('permission', 'Sign in to change your phone privacy.')
  if (getConnectivity() === 'offline')
    throw new MockError(
      'offline',
      `Couldn't save because you're offline. Your phone is still ${stored.phoneHidden ? 'hidden from' : 'visible to'} clubs.`,
    )
  checkMockSave()
  let saved: MyAccount | null = null
  mockStore.update((draft) => {
    const account = draft.playerAccounts.find((a) => a.playerId === session.account.id)
    if (!account) throw new MockError('permission', 'Sign in to change your phone privacy.')
    account.phoneHidden = input.phoneHidden
    saved = myAccountOf(draft, session.account.id)
  })
  if (!saved) throw new Error('Phone privacy save produced no result.')
  return saved
}
