'use client'
import { useQuery } from '@tanstack/react-query'
import { getClubPlayers } from './fetchers'
import { clubPlayerKeys } from './queryKeys'
export function useClubPlayers(filters: Parameters<typeof getClubPlayers>[0] = {}) {
  return useQuery({
    queryKey: [...clubPlayerKeys.all, 'list', filters],
    queryFn: () => getClubPlayers(filters),
  })
}
