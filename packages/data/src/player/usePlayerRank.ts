'use client'
import { useQuery } from '@tanstack/react-query'
import { getPlayerRank } from './fetchers'
import { playerKeys } from './queryKeys'
export function usePlayerRank(playerId: string) {
  return useQuery({
    queryKey: playerKeys.rank(playerId),
    queryFn: ({ signal }) => getPlayerRank(playerId, signal),
    enabled: Boolean(playerId),
    networkMode: 'always',
    retry: false,
  })
}
