'use client'

import { useQuery } from '@tanstack/react-query'
import type { AdminClubListParams } from './club.types'
import { listAdminClubs } from './fetchers'
import { clubKeys } from './queryKeys'

/**
 * A-CLUBS rows for a search and access filter, with the per-filter counts. `enabled: false` keeps a
 * privileged read from running before the platform-owner session is confirmed.
 */
export function useAdminClubs(
  params: AdminClubListParams = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: clubKeys.adminList(params),
    queryFn: ({ signal }) => listAdminClubs(params, signal),
    enabled: options.enabled ?? true,
  })
}
