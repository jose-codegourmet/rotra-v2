import type { LeaderboardPeriod } from './leaderboard.types'

export const leaderboardKeys = {
  all: ['leaderboard'] as const,
  pages: (period: LeaderboardPeriod = 'year', viewerId?: string) =>
    ['leaderboard', 'pages', period, viewerId ?? null] as const,
  /** A club's leaderboard pages; under `all`, so leaderboard invalidation reaches it too. */
  clubPages: (clubId: string, period: LeaderboardPeriod = 'year', viewerId?: string) =>
    ['leaderboard', 'club', clubId, 'pages', period, viewerId ?? null] as const,
  search: (query: string, period: LeaderboardPeriod = 'year', viewerId?: string) =>
    ['leaderboard', 'search', period, viewerId ?? null, query.trim().toLowerCase()] as const,
  myPosition: (playerId?: string) =>
    playerId
      ? (['leaderboard', 'my-position', playerId] as const)
      : (['leaderboard', 'my-position'] as const),
  myPeriodPosition: (playerId: string | undefined, period: LeaderboardPeriod) =>
    ['leaderboard', 'my-period-position', playerId ?? null, period] as const,
}
