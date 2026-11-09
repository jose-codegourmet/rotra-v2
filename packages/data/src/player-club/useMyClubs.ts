'use client'
import { useQuery } from '@tanstack/react-query'
import { getMyClubs } from './fetchers'
import { playerClubKeys } from './queryKeys'
export function useMyClubs(playerId: string | null) {
  return useQuery({
    queryKey: playerClubKeys.mine(playerId ?? ''),
    queryFn: ({ signal }) => getMyClubs(signal),
    enabled: !!playerId,
    retry: false,
    networkMode: 'always',
  })
}
