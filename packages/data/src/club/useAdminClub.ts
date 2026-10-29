'use client'

import { useQuery } from '@tanstack/react-query'
import { getAdminClub } from './fetchers'
import { clubKeys } from './queryKeys'

/** A-CLUB-DETAIL: identity, account, price, pending name change and Overview facts. */
export function useAdminClub(id: string) {
  return useQuery({
    queryKey: clubKeys.adminDetail(id),
    queryFn: ({ signal }) => getAdminClub(id, signal),
  })
}
