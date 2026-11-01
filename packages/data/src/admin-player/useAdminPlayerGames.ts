'use client'
import { useQuery } from '@tanstack/react-query'
import { getAdminPlayerGames } from './fetchers'
import { adminPlayerKeys } from './queryKeys'
export function useAdminPlayerGames(id: string) {
  return useQuery({
    queryKey: adminPlayerKeys.games(id),
    queryFn: ({ signal }) => getAdminPlayerGames(id, signal),
    enabled: !!id,
  })
}
