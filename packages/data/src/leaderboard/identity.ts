import type { MockState } from '../mock/store'

/** One ROTRA ID per person. Unclaimed records must belong to exactly one distinct active club. */
export function unclaimedClubCount(state: MockState, playerId: string): number | undefined {
  const account = state.playerAccounts.find((entry) => entry.playerId === playerId)
  if (account?.claimed) return undefined
  const memberships = state.clubPlayers.filter((entry) => entry.playerId === playerId)
  if (
    !account &&
    (memberships.length === 0 || memberships.some((entry) => entry.identity === 'registered'))
  )
    return undefined
  return new Set(
    memberships
      .filter((entry) => entry.identity === 'unclaimed' && !entry.removedAt)
      .map((entry) => entry.clubId),
  ).size
}
