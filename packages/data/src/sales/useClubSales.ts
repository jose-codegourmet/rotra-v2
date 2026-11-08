'use client'

import { useQuery } from '@tanstack/react-query'
import { getClubSales } from './fetchers'
import { salesKeys } from './queryKeys'

/**
 * A-CLUB-SALES: what one club paid ROTRA against its sessions, month by month (data is null when
 * the club does not exist). `enabled: false` waits for the platform-owner session.
 */
export function useClubSales(clubId: string, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: salesKeys.club(clubId),
    queryFn: ({ signal }) => getClubSales(clubId, signal),
    enabled: options.enabled ?? true,
  })
}
