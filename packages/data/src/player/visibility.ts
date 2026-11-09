import { getSession } from '../auth/fetchers'
import { MockError } from '../mock/errors'
import { readMockState } from '../mock/store'
export const PROFILE_LOGIN_MESSAGE = 'Log in with ROTRA to see this profile.'
/** Existing fixture identities without an account are public unless explicitly unclaimed/guest. */
export function isPrivatePlayer(playerId: string) {
  const state = readMockState()
  const account = state.playerAccounts.find((a) => a.playerId === playerId)
  const profile = state.playerProfiles.find((p) => p.playerId === playerId)
  return !!(
    account?.profilePrivate ||
    profile?.profilePrivate ||
    account?.claimed === false ||
    state.clubPlayers.some(
      (p) => p.playerId === playerId && (p.identity === 'guest' || p.identity === 'unclaimed'),
    )
  )
}
export async function requireProfileAccess(playerId: string) {
  if (isPrivatePlayer(playerId) && !(await getSession('player')))
    throw new MockError('permission', PROFILE_LOGIN_MESSAGE)
}
