'use client'

import { useQuery } from '@tanstack/react-query'
import { listClubNameRequests } from './fetchers'
import { clubKeys } from './queryKeys'

/**
 * Club name changes waiting on the platform owner, and the recently decided ones. `enabled: false`
 * keeps a privileged read from running before the platform-owner session is confirmed.
 */
export function useClubNameRequests(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: clubKeys.nameRequests(),
    queryFn: ({ signal }) => listClubNameRequests(signal),
    enabled: options.enabled ?? true,
  })
}
