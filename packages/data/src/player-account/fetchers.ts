import { emailField } from '@rotra/schema/email'
import { passwordField } from '@rotra/schema/password'
import { type PersonalProfileValues, personalProfileSchema } from '@rotra/schema/personal-details'
import { getSession, signIn } from '../auth/fetchers'
import { claimLinkScenarios } from '../fixtures/playerAccounts'
import { playerRequest } from '../leaderboard/request'
import { checkMockSave, getMockDevState } from '../mock/bridge'
import { MockError } from '../mock/errors'
import { delay } from '../mock/latency'
import { mockStore, readMockState } from '../mock/store'
import { applyPersonalProfile } from '../player/fetchers'
import { maskPhone } from './playerAccount.rules'
import type { ClaimLink, CompleteClaimResult, MyAccount } from './playerAccount.types'

/** The signed-in player's own contacts; null when signed out. Never a public fetcher. */
export async function getMyAccount(signal?: AbortSignal): Promise<MyAccount | null> {
  await playerRequest(signal)
  const session = await getSession('player')
  const account = session
    ? readMockState().playerAccounts.find((entry) => entry.playerId === session.account.id)
    : undefined
  return account
    ? {
        playerId: account.playerId,
        phone: account.phone,
        email: account.email,
        phoneHidden: account.phoneHidden,
      }
    : null
}

/** Same acknowledgement for known and unknown emails. No email is delivered in the mock. */
export async function requestPasswordReset(email: string) {
  await delay(400)
  if (getMockDevState().offline)
    throw new MockError(
      'offline',
      "Couldn't send because you're offline. Try again when you're connected.",
    )
  emailField.parse(email)
  return { acknowledged: true }
}
export async function getResetLink(token: string, signal?: AbortSignal) {
  await delay(200, signal)
  if (getMockDevState().offline)
    throw new MockError('offline', "You're offline. Reconnect to check this reset link.")
  const status = readMockState().resetLinks[token]
  return { token, status: status === 'valid' ? ('valid' as const) : ('invalid' as const) }
}
/** Simulate consuming a reset link. Passwords are validated but never retained or returned. */
export async function resetPassword({ token, password }: { token: string; password: string }) {
  await delay(400)
  if (getMockDevState().offline)
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
  await delay(300, signal)
  if (getMockDevState().offline)
    throw new MockError('offline', "You're offline. Reconnect to open this registration link.")
  const state = readMockState()
  const record = state.claimLinks[token]
  const profile = record && state.playerProfiles.find((p) => p.playerId === record.playerId)
  const account = record && state.playerAccounts.find((a) => a.playerId === record.playerId)
  if (!record || !profile || !account) return null
  return {
    token,
    status: record.status === 'valid' && account.claimed ? 'claimed' : record.status,
    clubName: record.clubName,
    preview: {
      playerId: profile.playerId,
      fullName: profile.fullName,
      nickname: profile.nickname,
      rtrId: profile.rtrId,
      picture: profile.picture,
      maskedPhone: maskPhone(account.phone),
    },
    preset: {
      fullName: profile.fullName,
      nickname: profile.nickname ?? '',
      facebook: profile.socialLinks.facebook,
    },
  }
}

export type CompleteClaimInput = {
  token: string
  values: PersonalProfileValues & { email: string; password: string }
}
/**
 * Registers the linked profile: sets email and personal details and marks it claimed. Without
 * changes it only closes the link, for a profile that is already registered.
 */
function finishClaim(token: string, changes?: { email: string; personal: PersonalProfileValues }) {
  let result: CompleteClaimResult | undefined
  mockStore.update((draft) => {
    const record = draft.claimLinks[token]
    const account = record && draft.playerAccounts.find((a) => a.playerId === record.playerId)
    const profile = record && draft.playerProfiles.find((p) => p.playerId === record.playerId)
    if (!record || !account || !profile)
      throw new MockError('permission', 'The registration link has expired or was replaced.')
    if (changes) {
      applyPersonalProfile(profile, changes.personal)
      account.email = changes.email
      account.claimed = true
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
  await delay(1100)
  if (getMockDevState().offline) throw new MockError('offline', CLAIM_OFFLINE)
  const { email: rawEmail, password, ...rest } = values
  const personal = personalProfileSchema.parse(rest)
  const email = emailField.parse(rawEmail)
  passwordField.parse(password)
  const state = readMockState()
  const record = state.claimLinks[token]
  const account = record && state.playerAccounts.find((a) => a.playerId === record.playerId)
  if (!record || !account || record.status === 'expired')
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
  })
  const session = await signIn('player', { identifier: email, password })
  return { ...result, session }
}

/** Processing links: the first check is still processing, the second completes (prototype). */
export async function checkClaimStatus(token: string) {
  await delay(600)
  if (getMockDevState().offline)
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
    playingStyle: '',
    experienceYears: '',
    experienceMonths: '',
    facebook: preset.facebook,
    instagram: '',
    youtube: '',
    linkedin: '',
  }
}

/** Sets phoneHidden for the signed-in player. Offline leaves the stored value as it was. */
export async function setPhonePrivacy(input: { phoneHidden: boolean }): Promise<MyAccount> {
  await delay(900)
  const session = await getSession('player')
  if (!session) throw new MockError('permission', 'Sign in to change your phone privacy.')
  const stored = readMockState().playerAccounts.find((a) => a.playerId === session.account.id)
  if (!stored) throw new MockError('permission', 'Sign in to change your phone privacy.')
  if (getMockDevState().offline)
    throw new MockError(
      'offline',
      `Couldn't save because you're offline. Your phone is still ${stored.phoneHidden ? 'hidden from' : 'visible to'} clubs.`,
    )
  checkMockSave()
  let saved: MyAccount | undefined
  mockStore.update((draft) => {
    const account = draft.playerAccounts.find((a) => a.playerId === session.account.id)
    if (!account) throw new MockError('permission', 'Sign in to change your phone privacy.')
    account.phoneHidden = input.phoneHidden
    saved = {
      playerId: account.playerId,
      phone: account.phone,
      email: account.email,
      phoneHidden: account.phoneHidden,
    }
  })
  if (!saved) throw new Error('Phone privacy save produced no result.')
  return saved
}
