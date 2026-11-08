'use client'
import { useQuery } from '@tanstack/react-query'
import { getClubPlayer } from './fetchers'
import { clubPlayerKeys } from './queryKeys'
export function useClubPlayer(id: string) {
  return useQuery({
    // Picking a new avatar in Player Information happens in another app/tab.
    refetchOnWindowFocus: true,
    queryKey: [...clubPlayerKeys.all, 'detail', id],
    queryFn: () => getClubPlayer(id),
  })
}
