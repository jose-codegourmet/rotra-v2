'use client'

import { useQuery } from '@tanstack/react-query'
import { listClubNameRequests } from './fetchers'
import { clubKeys } from './queryKeys'

/** Club name changes waiting on the platform owner, and the recently decided ones. */
export function useClubNameRequests() {
  return useQuery({
    queryKey: clubKeys.nameRequests(),
    queryFn: ({ signal }) => listClubNameRequests(signal),
  })
}
