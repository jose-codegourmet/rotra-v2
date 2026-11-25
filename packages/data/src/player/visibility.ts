import { getSession } from '../auth/fetchers'
import { unclaimedClubCount } from '../leaderboard/identity'
import { MockError } from '../mock/errors'
import { type MockState, readMockState } from '../mock/store'
import type { ProfileVisibility } from './player.types'
import { PROFILE_LOGIN_MESSAGE, PROFILE_PRIVATE_MESSAGE } from './visibility.rules'

export { PROFILE_LOGIN_MESSAGE, PROFILE_PRIVATE_MESSAGE } from './visibility.rules'

/** The stored level of a profile (`players.profile_visibility`); an identity without one is public. */
export function profileVisibility(playerId: string, state = readMockState()): ProfileVisibility {
  return state.playerProfiles.find((p) => p.playerId === playerId)?.profileVisibility ?? 'public'
}
/**
 * Masked for visitors who are not signed in: a Private or Always private profile, an unclaimed
 * account, or a guest/unclaimed club identity. Existing fixture identities without an account are
 * public unless explicitly unclaimed/guest.
 */
export function isPrivatePlayer(playerId: string, state: MockState = readMockState()) {
  const account = state.playerAccounts.find((a) => a.playerId === playerId)
  if (unclaimedClubCount(state, playerId) === 1) return false
  return !!(
    profileVisibility(playerId, state) !== 'public' ||
    account?.claimed === false ||
    state.clubPlayers.some(
      (p) => p.playerId === playerId && (p.identity === 'guest' || p.identity === 'unclaimed'),
    )
  )
}
/** Always private (D-2026-11-12-01): masked for everyone but the player themselves. */
export function isAlwaysPrivatePlayer(
  playerId: string | null | undefined,
  state: MockState = readMockState(),
) {
  return !!playerId && profileVisibility(playerId, state) === 'always_private'
}
/**
 * Show my profile stats (2026-11-13-player-stats-visibility): off hides Latest stats from everyone
 * but the player. Queue Master and Admin are not exempt. Missing setting = shown.
 */
export function isStatsHiddenFrom(playerId: string, viewerPlayerId?: string | null) {
  if (viewerPlayerId && viewerPlayerId === playerId) return false
  return (
    readMockState().playerProfiles.find((p) => p.playerId === playerId)?.showProfileStats === false
  )
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
