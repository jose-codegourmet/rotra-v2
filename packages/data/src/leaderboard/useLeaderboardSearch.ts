'use client'
import { useQuery } from '@tanstack/react-query'
import { searchLeaderboard } from './fetchers'
import type { LeaderboardPeriod } from './leaderboard.types'
import { leaderboardKeys } from './queryKeys'
export function useLeaderboardSearch(
  query: string,
  period: LeaderboardPeriod = 'year',
  viewerId?: string,
) {
  return useQuery({
    queryKey: leaderboardKeys.search(query, period, viewerId),
    queryFn: ({ signal }) => searchLeaderboard(query, signal, period, viewerId ?? null),
    enabled: Boolean(query.trim()) && !/^RTR-/i.test(query.trim()),
    networkMode: 'always',
    retry: false,
  })
}
