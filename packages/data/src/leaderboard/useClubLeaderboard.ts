'use client'
import { useInfiniteQuery } from '@tanstack/react-query'
import { getClubLeaderboardPage } from './fetchers'
import type { LeaderboardPeriod } from './leaderboard.types'
import { leaderboardKeys } from './queryKeys'

/**
 * A club's leaderboard (D-2026-11-25-04): pages of 25, like `useLeaderboard`. Group rows by
 * `position` for the podium; a shared place holds several rows.
 */
export function useClubLeaderboard(
  clubId: string,
  period: LeaderboardPeriod = 'year',
  viewerId?: string,
) {
  return useInfiniteQuery({
    queryKey: leaderboardKeys.clubPages(clubId, period, viewerId),
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) =>
      getClubLeaderboardPage(
        { clubId, offset: pageParam, limit: 25, period },
        signal,
        viewerId ?? null,
      ),
    getNextPageParam: (last, pages) => {
      const shown = pages.reduce((count, page) => count + page.entries.length, 0)
      return shown < last.total ? shown : undefined
    },
    enabled: Boolean(clubId),
    networkMode: 'always',
    retry: false,
  })
}
