import { getSession } from '../auth/fetchers'
import { MockError } from '../mock/errors'
import { readMockState } from '../mock/store'
import type { ProfileVisibility } from './player.types'
import { PROFILE_LOGIN_MESSAGE, PROFILE_PRIVATE_MESSAGE } from './visibility.rules'

export { PROFILE_LOGIN_MESSAGE, PROFILE_PRIVATE_MESSAGE } from './visibility.rules'

/** The stored level of a profile (`players.profile_visibility`); an identity without one is public. */
export function profileVisibility(playerId: string): ProfileVisibility {
  return (
    readMockState().playerProfiles.find((p) => p.playerId === playerId)?.profileVisibility ??
    'public'
  )
}
/**
 * Masked for visitors who are not signed in: a Private or Always private profile, an unclaimed
 * account, or a guest/unclaimed club identity. Existing fixture identities without an account are
 * public unless explicitly unclaimed/guest.
 */
export function isPrivatePlayer(playerId: string) {
  const state = readMockState()
  const account = state.playerAccounts.find((a) => a.playerId === playerId)
  return !!(
    profileVisibility(playerId) !== 'public' ||
    account?.claimed === false ||
    state.clubPlayers.some(
      (p) => p.playerId === playerId && (p.identity === 'guest' || p.identity === 'unclaimed'),
    )
  )
}
/** Always private (D-2026-11-12-01): masked for everyone but the player themselves. */
export function isAlwaysPrivatePlayer(playerId: string | null | undefined) {
  return !!playerId && profileVisibility(playerId) === 'always_private'
}
/** Hide me from Player Information: not found by Queue's Add player or RTR ID search. */
export function isHiddenFromDirectory(playerId: string) {
  return !!readMockState().playerProfiles.find((p) => p.playerId === playerId)?.hiddenFromDirectory
}
/**
 * The profile, rank and games reads: an always-private profile is refused for everyone but the
 * player (no sign-in helps); a private one asks a visitor to sign in.
 */
export async function requireProfileAccess(playerId: string) {
  const session = await getSession('player')
  if (session?.account.id === playerId) return
  if (isAlwaysPrivatePlayer(playerId)) throw new MockError('permission', PROFILE_PRIVATE_MESSAGE)
  if (isPrivatePlayer(playerId) && !session)
    throw new MockError('permission', PROFILE_LOGIN_MESSAGE)
}
