'use client'

import { useQuery } from '@tanstack/react-query'
import { getClubPlayerYearStats } from './profileStats'
import { clubPlayerKeys } from './queryKeys'

/** Stats · YEAR for the Queue Master's player profile dialog; pass null while it is closed. */
export function useClubPlayerYearStats(clubPlayerId: string | null) {
  return useQuery({
    queryKey: clubPlayerKeys.yearStats(clubPlayerId ?? ''),
    queryFn: ({ signal }) => getClubPlayerYearStats(clubPlayerId ?? '', signal),
    enabled: !!clubPlayerId,
    retry: false,
    networkMode: 'always',
  })
}
