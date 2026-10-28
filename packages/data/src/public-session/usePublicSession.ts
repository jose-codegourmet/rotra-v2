'use client'
import { useQuery } from '@tanstack/react-query'
import { getPublicSession } from './fetchers'
import { publicSessionKeys } from './queryKeys'
/**
 * The public session page by slug. `visitor` is the guest's own browser (the /s route): offline
 * the refetch fails and any cached copy stays. The operator preview leaves it off.
 */
export function usePublicSession(slug: string, options?: { visitor?: boolean }) {
  return useQuery({
    queryKey: publicSessionKeys.detail(slug),
    queryFn: () => getPublicSession(slug, { visitor: options?.visitor }),
    enabled: slug !== '',
  })
}
