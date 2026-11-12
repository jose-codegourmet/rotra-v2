'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { canRefreshNow, refreshAvailableAt } from '../public-session/publicSession.rules'

export type ThrottledRefreshOptions = {
  /**
   * Refresh when the tab becomes visible again (D-2026-11-09-04: "it also refreshes when they come
   * back to the tab"). Off by default: the public session queries already refetch on window focus.
   * Turn it on where the page's queries do not (Player lists, Admin inboxes).
   */
  refreshOnReturn?: boolean
}

/**
 * A page's **Refresh**, by button or by pulling down (D-2026-11-09-04): runs `refetch` for the
 * page's data only, rendered in place, at most once every 10 seconds. `canRefresh` is false until
 * the lock ends (copy “Refresh again in a few seconds”). No polling.
 *
 * `refetch` is read through a ref, so an inline arrow is fine.
 */
export function useThrottledRefresh(
  refetch: () => Promise<unknown>,
  { refreshOnReturn = false }: ThrottledRefreshOptions = {},
) {
  const refetchRef = useRef(refetch)
  refetchRef.current = refetch
  const [lastRefreshedAt, setLastRefreshedAt] = useState<number | null>(null)
  const [isRefreshing, setRefreshing] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const availableAt = refreshAvailableAt(lastRefreshedAt)

  // Re-enable when the 10 s are up.
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
      await refetchRef.current()
    } finally {
      setRefreshing(false)
    }
    return true
  }, [lastRefreshedAt])

  useEffect(() => {
    if (!refreshOnReturn) return
    const onVisible = () => {
      if (!document.hidden) void refresh()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [refreshOnReturn, refresh])

  return {
    refresh,
    isRefreshing,
    /** Time of the last refresh, or null before the first one */
    lastRefreshedAt,
    /** When Refresh works again; null when it never ran */
    refreshAvailableAt: availableAt,
    canRefresh: canRefreshNow(lastRefreshedAt, now),
  }
}
