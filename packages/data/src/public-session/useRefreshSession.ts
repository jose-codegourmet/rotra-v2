'use client'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { useThrottledRefresh } from '../refresh/useThrottledRefresh'

/**
 * The page's **Refresh** (D-2026-11-09-04), by button or by pulling down: refetches the session's
 * data only (snapshot, personal part, join request), rendered in place. No polling. Refresh is
 * throttled to once per 10 s on the client: `canRefresh` is false until `refreshAvailableAt`
 * (tooltip “Refresh again in a few seconds”). Window focus refetches come from the queries
 * themselves and do not start the throttle.
 *
 * Bar copy: “Updated TIME” reads `lastRefreshedAt ?? page.lastSyncedAt`; add “· Venue changes
 * haven't synced yet” when `page.hasPendingChanges`.
 */
export function useRefreshSession(slug: string) {
  const client = useQueryClient()
  const refetch = useCallback(
    () =>
      client.refetchQueries({
        predicate: (query) =>
          query.queryKey[0] === 'public-session' &&
          query.queryKey[2] === slug &&
          query.queryKey[1] !== 'invite-code',
      }),
    [client, slug],
  )
  return useThrottledRefresh(refetch)
}
