'use client'

import { useQuery } from '@tanstack/react-query'
import type { AdminClubListParams } from './club.types'
import { listAdminClubs } from './fetchers'
import { clubKeys } from './queryKeys'

/** A-CLUBS rows for a search and access filter, with the per-filter counts. */
export function useAdminClubs(params: AdminClubListParams = {}) {
  return useQuery({
    queryKey: clubKeys.adminList(params),
    queryFn: ({ signal }) => listAdminClubs(params, signal),
  })
}
