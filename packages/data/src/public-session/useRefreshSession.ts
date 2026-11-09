'use client'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useState } from 'react'
import { canRefreshNow, refreshAvailableAt } from './publicSession.rules'

/**
 * The page's **Refresh** (D-2026-11-09-04): refetches the session's data only (snapshot, personal
 * part, join request), rendered in place. No polling. Refresh is throttled to once per 10 s on the
 * client: `canRefresh` is false until `refreshAvailableAt` (tooltip “Refresh again in a few
 * seconds”). Window focus refetches come from the queries themselves and do not start the throttle.
 *
 * Bar copy: “Updated TIME” reads `lastRefreshedAt ?? page.lastSyncedAt`; add “· Venue changes
 * haven't synced yet” when `page.hasPendingChanges`.
 */
export function useRefreshSession(slug: string) {
  const client = useQueryClient()
  const [lastRefreshedAt, setLastRefreshedAt] = useState<number | null>(null)
  const [isRefreshing, setRefreshing] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const availableAt = refreshAvailableAt(lastRefreshedAt)

  // Re-enable the button when the 10 s are up.
  useEffect(() => {
    if (availableAt === null) return
    const wait = availableAt - Date.now()
    if (wait <= 0) {
      setNow(Date.now())
      return
    }
    const timer = setTimeout(() => setNow(Date.now()), wait)
    return () => clearTimeout(timer)
  }, [availableAt])

  const refresh = useCallback(async () => {
    const at = Date.now()
    if (!canRefreshNow(lastRefreshedAt, at)) return false
    setLastRefreshedAt(at)
    setNow(at)
    setRefreshing(true)
    try {
      await client.refetchQueries({
        predicate: (query) =>
          query.queryKey[0] === 'public-session' &&
          query.queryKey[2] === slug &&
          query.queryKey[1] !== 'invite-code',
      })
    } finally {
      setRefreshing(false)
    }
    return true
  }, [client, lastRefreshedAt, slug])

  return {
    refresh,
    isRefreshing,
    /** Time of the last tap, or null before the first one */
    lastRefreshedAt,
    /** When Refresh works again; null when it never ran */
    refreshAvailableAt: availableAt,
    canRefresh: canRefreshNow(lastRefreshedAt, now),
  }
}
