'use client'
import { useQuery } from '@tanstack/react-query'
import { getPlayerProfile } from '../player/fetchers'
import { playerKeys } from '../player/queryKeys'

/** Shares the profile query and its access checks; public places never include a below-cutoff player. */
export function usePlayerLeaderboardPlaces(playerId: string) {
  return useQuery({
    queryKey: playerKeys.profile(playerId),
    queryFn: ({ signal }) => getPlayerProfile(playerId, signal),
    select: (profile) => profile?.leaderboardPlaces ?? [],
    enabled: Boolean(playerId),
    networkMode: 'always',
    retry: false,
  })
}
