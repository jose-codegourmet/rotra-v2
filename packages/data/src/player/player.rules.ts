import type { PlayerRank, PlayerSessionRecord } from './player.types'
// Open decision: Window boundaries (calendar months and timezone). 90 days is prototype reference behaviour.
export const WINDOW_DAYS = 90
export function countRecentStandardMatches(
  sessions: readonly PlayerSessionRecord[],
  now: Date | number,
  windowDays = WINDOW_DAYS,
): number {
  const end = Number(now),
    start = end - windowDays * 86400000
  return sessions.reduce((count, session) => {
    const at = Date.parse(session.finishedAt)
    return (
      count +
      (at >= start && at <= end
        ? session.games.filter(
            (g) => g.counting === 'counted' && (g.format === 'singles' || g.format === 'doubles'),
          ).length
        : 0)
    )
  }, 0)
}
export function isLeaderboardEligible(
  recentCount: number,
  matchRequirement: number,
  rankState: PlayerRank['state'],
): boolean {
  return rankState !== 'needs_reassessment' && recentCount >= matchRequirement
}
export function rankDisplayStatus({
  level,
  state,
  updatePending,
  position,
  recentCount,
  matchRequirement,
}: {
  level: number | null
  state: PlayerRank['state']
  updatePending: unknown
  position: number | null
  recentCount: number
  matchRequirement: number
}) {
  if (level === null) return 'not-calculated'
  if (state === 'needs_reassessment') return 'needs-reassessment'
  if (position !== null) return updatePending ? 'updating' : 'on-leaderboard'
  if (recentCount >= matchRequirement) return 'qualifies'
  return 'provisional'
}
/** Open decision: Numerical ranking. Retain fixture order, filtered by the current requirement; no rating math. */
export function orderLeaderboard<
  T extends { recentCount: number; state: PlayerRank['state']; levelIndex: number | null },
>(entries: readonly T[], matchRequirement: number): T[] {
  return entries.filter(
    (e) => e.levelIndex !== null && isLeaderboardEligible(e.recentCount, matchRequirement, e.state),
  )
}
