'use client'
import { useQuery } from '@tanstack/react-query'
import { getClubPage } from './fetchers'
import { clubPageKeys } from './queryKeys'

/** P-CLUB-PAGE and P-CLUB-MEMBERS: the club, its registered members and its sessions; null when unknown. */
export function useClubPage(clubId: string) {
  return useQuery({
    queryKey: clubPageKeys.page(clubId),
    queryFn: ({ signal }) => getClubPage(clubId, signal),
    enabled: Boolean(clubId),
    networkMode: 'always',
    retry: false,
  })
}
