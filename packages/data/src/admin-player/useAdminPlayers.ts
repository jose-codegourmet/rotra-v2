'use client'

import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { AdminPlayerListParams } from './adminPlayer.types'
import { listAdminPlayers } from './fetchers'
import { adminPlayerKeys } from './queryKeys'

/**
 * A-PLAYERS rows for a search, account filter and limit. The key holds the params, so after an error
 * `refetch()` retries the same search; previous rows stay while 25 more load. `enabled: false` keeps
 * a privileged read from running before the platform-owner session is confirmed.
 */
export function useAdminPlayers(
  params: AdminPlayerListParams = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: adminPlayerKeys.list(params),
    queryFn: ({ signal }) => listAdminPlayers(params, signal),
    placeholderData: keepPreviousData,
    enabled: options.enabled ?? true,
  })
}
