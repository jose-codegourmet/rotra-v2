'use client'
import { useQuery } from '@tanstack/react-query'
import { getPlayerGames } from './fetchers'
import { playerKeys } from './queryKeys'
export function usePlayerGames(playerId: string) {
  return useQuery({ queryKey: playerKeys.games(playerId), queryFn: ({ signal }) => getPlayerGames(playerId, signal), enabled: Boolean(playerId), networkMode: 'always', retry: false })
}
