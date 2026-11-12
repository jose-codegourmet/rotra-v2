'use client'

import { useQuery } from '@tanstack/react-query'
import { getAdminPlayer, getAdminPlayerProfile } from './fetchers'
import { adminPlayerKeys } from './queryKeys'

/** A-PLAYER-DETAIL: identity, private contacts, account, rank status and same-name identities; null = not found. */
export function useAdminPlayer(id: string, options: { enabled?: boolean } = {}) {
  return useQuery({
    // Picking a new avatar in Player Information happens in another app/tab.
    refetchOnWindowFocus: true,
    queryKey: adminPlayerKeys.detail(id),
    queryFn: ({ signal }) => getAdminPlayer(id, signal),
    enabled: options.enabled ?? true,
  })
}

/** Profile fields shown in Admin Quick view. */
export function useAdminPlayerProfile(id: string) {
  return useQuery({
    queryKey: adminPlayerKeys.profile(id),
    queryFn: ({ signal }) => getAdminPlayerProfile(id, signal),
    enabled: Boolean(id),
  })
}
