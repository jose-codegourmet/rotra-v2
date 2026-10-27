'use client'
import { useQuery } from '@tanstack/react-query'
import { getMyLeaderboardPosition } from './fetchers'
import { leaderboardKeys } from './queryKeys'
/** Account id scopes the cache, so switching accounts cannot reuse another player's position. */
export function useMyLeaderboardPosition(playerId?: string) {
  return useQuery({ queryKey: leaderboardKeys.myPosition(playerId), queryFn: ({ signal }) => getMyLeaderboardPosition(signal), enabled: Boolean(playerId), networkMode: 'always', retry: false })
}
