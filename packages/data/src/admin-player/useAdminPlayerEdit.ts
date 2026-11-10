'use client'

import { useQuery } from '@tanstack/react-query'
import { getAdminPlayerEdit } from './fetchers'
import { adminPlayerKeys } from './queryKeys'

/** A-PLAYER-EDIT: what the Edit form loads (profile, account, previous picture, password marker); null = not found. */
export function useAdminPlayerEdit(id: string, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: adminPlayerKeys.edit(id),
    queryFn: ({ signal }) => getAdminPlayerEdit(id, signal),
    enabled: options.enabled ?? true,
  })
}
