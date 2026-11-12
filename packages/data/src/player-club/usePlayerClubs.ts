'use client'
import { useQuery } from '@tanstack/react-query'
import { getPlayerClubs } from './fetchers'
import { playerClubKeys } from './queryKeys'
/** A player's clubs (P-PROFILE clubs card, #766); the owner's rows include how they joined. */
export function usePlayerClubs(playerId: string | null) {
  return useQuery({
    queryKey: playerClubKeys.player(playerId ?? ''),
    queryFn: ({ signal }) => getPlayerClubs(playerId ?? '', signal),
    enabled: !!playerId,
    retry: false,
    networkMode: 'always',
  })
}
