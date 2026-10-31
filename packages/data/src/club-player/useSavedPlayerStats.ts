'use client'

import { useQuery } from '@tanstack/react-query'
import { DEMO_CLUB_ID } from '../fixtures/clubs'
import { getSavedPlayerStats } from './fetchers'
import { clubPlayerKeys } from './queryKeys'

export function useSavedPlayerStats() {
  return useQuery({
    queryKey: clubPlayerKeys.stats(DEMO_CLUB_ID),
    queryFn: getSavedPlayerStats,
    // Refresh a page left open across the week boundary; mutations also invalidate this query.
    refetchInterval: 60_000,
  })
}
