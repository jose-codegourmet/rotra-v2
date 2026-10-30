'use client'

import { useQuery } from '@tanstack/react-query'
import { getAdminPlayer } from './fetchers'
import { adminPlayerKeys } from './queryKeys'

/** A-PLAYER-DETAIL: identity, private contacts, account, rank status and same-name identities; null = not found. */
export function useAdminPlayer(id: string, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: adminPlayerKeys.detail(id),
    queryFn: ({ signal }) => getAdminPlayer(id, signal),
    enabled: options.enabled ?? true,
  })
}
