'use client'

import { queryOptions, useQueries } from '@tanstack/react-query'
import { useMemo, useSyncExternalStore } from 'react'
import { parseAdminSession, readAdminSessionMarker } from './cookie'
import { getAdminSession } from './fetchers'
import { adminAccountKeys } from './queryKeys'
import { subscribeAdminSession } from './session'

const serverSnapshot = () => null

/** Non-owner sessions come from the mock marker without creating a cached query. */
export function useAdminSession() {
  const marker = useSyncExternalStore<string | null>(
    subscribeAdminSession,
    readAdminSessionMarker,
    serverSnapshot,
  )
  const session = useMemo(() => parseAdminSession(marker ?? ''), [marker])
  const hydrated = marker !== null
  // An empty useQueries list removes the observer on sign-out. A disabled useQuery would
  // still create a session entry and refill the cache immediately after client.clear().
  const sessionQuery = queryOptions({
    queryKey: adminAccountKeys.session(),
    queryFn: getAdminSession,
    networkMode: 'always',
    staleTime: Infinity,
    retry: false,
  })
  const queries: (typeof sessionQuery)[] =
    hydrated && session.kind === 'owner' ? [sessionQuery] : []
  const [query] = useQueries({ queries })

  return {
    data: session,
    isPending: !hydrated || Boolean(query?.isPending),
    isError: query?.isError ?? false,
    error: query?.error ?? null,
    loadedAt: query?.dataUpdatedAt ? new Date(query.dataUpdatedAt) : undefined,
    refetch: () => (query ? query.refetch() : getAdminSession()),
  }
}
