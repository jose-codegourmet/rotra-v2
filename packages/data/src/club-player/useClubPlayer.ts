'use client'
import { useQuery } from '@tanstack/react-query'
import { getClubPlayer } from './fetchers'
import { clubPlayerKeys } from './queryKeys'
export function useClubPlayer(id: string) {
  return useQuery({
    queryKey: [...clubPlayerKeys.all, 'detail', id],
    queryFn: () => getClubPlayer(id),
  })
}
