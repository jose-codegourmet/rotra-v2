'use client'
import { useQuery } from '@tanstack/react-query'
import { getAdminPlayersByIds } from './fetchers'
import { adminPlayerKeys } from './queryKeys'
export function useAdminPlayerSelection(ids: string[]) {
  return useQuery({
    queryKey: adminPlayerKeys.selection(ids),
    queryFn: ({ signal }) => getAdminPlayersByIds(ids, signal),
    enabled: ids.length > 0,
  })
}
