'use client'
import { useInfiniteQuery } from '@tanstack/react-query'
import { getLeaderboardPage } from './fetchers'
import type { LeaderboardPeriod } from './leaderboard.types'
import { leaderboardKeys } from './queryKeys'
export function useLeaderboard(period: LeaderboardPeriod = 'year', viewerId?: string) {
  return useInfiniteQuery({
    queryKey: leaderboardKeys.pages(period, viewerId),
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) =>
      getLeaderboardPage({ offset: pageParam, limit: 25, period }, signal),
    getNextPageParam: (last, pages) => {
      const shown = pages.reduce((count, page) => count + page.entries.length, 0)
      return shown < last.total ? shown : undefined
    },
    networkMode: 'always',
    retry: false,
  })
}
