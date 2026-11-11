import { getSession } from '../auth/fetchers'
import { getConnectivity } from '../connectivity/connectivity'
import { checkMockSave } from '../mock/bridge'
import { MockError } from '../mock/errors'
import { delay } from '../mock/latency'
import { mockStore, readMockState } from '../mock/store'
import type { ProfileVisibility } from '../player/player.types'
import { isRealDataMode } from '../real/mode'
import { realSetHiddenFromDirectory, realSetProfileVisibility } from '../real/player'
import type { MyAccount } from './playerAccount.types'

const SIGN_IN = 'Sign in to change your profile visibility.'

/** “public”, “private”, “always private”: the word in the offline error. */
export const profileVisibilityWord = (visibility: ProfileVisibility) =>
  visibility === 'always_private' ? 'always private' : visibility

/** `MyAccount` for the signed-in player, read from the store (contacts plus the profile's settings). */
export function myAccountOf(
  state: ReturnType<typeof readMockState>,
  playerId: string,
): MyAccount | null {
  const account = state.playerAccounts.find((entry) => entry.playerId === playerId)
  if (!account) return null
  const profile = state.playerProfiles.find((entry) => entry.playerId === playerId)
  return {
    playerId: account.playerId,
    phone: account.phone,
    email: account.email,
    phoneHidden: account.phoneHidden,
    emailConfirmedAt: account.emailConfirmedAt,
    profileVisibility: profile?.profileVisibility ?? 'public',
    hiddenFromDirectory: profile?.hiddenFromDirectory ?? false,
    avatarPreviousRef: account.avatarPreviousRef ?? null,
  }
}

/**
 * P-PROFILE-PRIVACY › Profile visibility. Confirmed by the server before the saved line changes;
 * offline leaves the stored level as it was.
 */
export async function setProfileVisibility(input: {
  profileVisibility: ProfileVisibility
}): Promise<MyAccount> {
  if (isRealDataMode()) return realSetProfileVisibility(input)
  await delay(600)
  const session = await getSession('player')
  if (!session) throw new MockError('permission', SIGN_IN)
  const stored = myAccountOf(readMockState(), session.account.id)
  if (!stored) throw new MockError('permission', SIGN_IN)
  if (getConnectivity() === 'offline')
    throw new MockError(
      'offline',
      `Couldn't save because you're offline. Your profile is still ${profileVisibilityWord(stored.profileVisibility)}.`,
    )
  checkMockSave()
  let saved: MyAccount | null = null
  mockStore.update((draft) => {
    const profile = draft.playerProfiles.find((p) => p.playerId === session.account.id)
    if (!profile) throw new MockError('permission', SIGN_IN)
    profile.profileVisibility = input.profileVisibility
    saved = myAccountOf(draft, session.account.id)
  })
  if (!saved) throw new Error('Profile visibility save produced no result.')
  return saved
}

/** P-PROFILE-PRIVACY › Player Information › Hide me from Player Information. */
export async function setHiddenFromDirectory(input: {
  hiddenFromDirectory: boolean
}): Promise<MyAccount> {
  if (isRealDataMode()) return realSetHiddenFromDirectory(input)
  await delay(600)
  const session = await getSession('player')
  if (!session) throw new MockError('permission', SIGN_IN)
  const stored = myAccountOf(readMockState(), session.account.id)
  if (!stored) throw new MockError('permission', SIGN_IN)
  if (getConnectivity() === 'offline')
    throw new MockError(
      'offline',
      `Couldn't save because you're offline. You are still ${stored.hiddenFromDirectory ? 'hidden from' : 'listed in'} Player Information.`,
    )
  checkMockSave()
  let saved: MyAccount | null = null
  mockStore.update((draft) => {
    const profile = draft.playerProfiles.find((p) => p.playerId === session.account.id)
    if (!profile) throw new MockError('permission', SIGN_IN)
    profile.hiddenFromDirectory = input.hiddenFromDirectory
    saved = myAccountOf(draft, session.account.id)
  })
  if (!saved) throw new Error('Player Information save produced no result.')
  return saved
}
