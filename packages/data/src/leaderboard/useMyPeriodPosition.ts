'use client'
import { useQuery } from '@tanstack/react-query'
import { getMyPeriodPosition } from './fetchers'
import type { LeaderboardPeriod } from './leaderboard.types'
import { leaderboardKeys } from './queryKeys'

export function useMyPeriodPosition(playerId: string | undefined, period: LeaderboardPeriod) {
  return useQuery({
    queryKey: leaderboardKeys.myPeriodPosition(playerId, period),
    queryFn: ({ signal }) => getMyPeriodPosition(period, signal),
    enabled: Boolean(playerId),
    networkMode: 'always',
    retry: false,
  })
}
