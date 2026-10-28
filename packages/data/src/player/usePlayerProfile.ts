'use client'
import { useQuery } from '@tanstack/react-query'
import { getPlayerProfile } from './fetchers'
import { playerKeys } from './queryKeys'
export function usePlayerProfile(playerId: string) {
  return useQuery({
    queryKey: playerKeys.profile(playerId),
    queryFn: ({ signal }) => getPlayerProfile(playerId, signal),
    enabled: Boolean(playerId),
    networkMode: 'always',
    retry: false,
  })
}
