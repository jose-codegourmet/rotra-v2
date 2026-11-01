'use client'

import { queryOptions, useQueries } from '@tanstack/react-query'
import { useMemo, useSyncExternalStore } from 'react'
import { isRealDataMode } from '../real/mode'
import type { AdminSession } from './adminAccount.types'
import { parseAdminSession, readAdminSessionMarker } from './cookie'
import { getAdminSession } from './fetchers'
import { adminAccountKeys } from './queryKeys'
import { subscribeAdminSession } from './session'

const serverSnapshot = () => null

/** Non-owner sessions come from the mock marker without creating a cached query. */
function useMockAdminSession() {
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

const SIGNED_OUT: AdminSession = { kind: 'signed-out', sessionEnded: false }

/**
 * Real data mode: the verified Supabase session read from `/api/auth/session` (no mock marker, and
 * the proxy deletes mock cookies). Sign-in and sign-out publish the next session into this query.
 */
function useRealAdminSession() {
  const [query] = useQueries({
    queries: [
      queryOptions({
        queryKey: adminAccountKeys.session(),
        queryFn: getAdminSession,
        networkMode: 'always',
        staleTime: Infinity,
        retry: false,
      }),
    ],
  })
  return {
    data: query.data ?? SIGNED_OUT,
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
    loadedAt: query.dataUpdatedAt ? new Date(query.dataUpdatedAt) : undefined,
    refetch: () => query.refetch(),
  }
}

export const useAdminSession = isRealDataMode() ? useRealAdminSession : useMockAdminSession
