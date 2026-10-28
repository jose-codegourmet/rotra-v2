'use client'
import { useQuery } from '@tanstack/react-query'
import { useMemo, useSyncExternalStore } from 'react'
import { parseAdminSession, readAdminSessionMarker } from './cookie'
import { getAdminSession } from './fetchers'
import { adminAccountKeys } from './queryKeys'
import { subscribeAdminSession } from './session'

const serverSnapshot = () => ''
/** The cookie snapshot prevents a cached owner result from exposing data after sign-out or Back. */
export function useAdminSession() {
  const marker = useSyncExternalStore(subscribeAdminSession, readAdminSessionMarker, serverSnapshot)
  const session = useMemo(() => parseAdminSession(marker), [marker])
  const query = useQuery({
    queryKey: adminAccountKeys.session(), queryFn: getAdminSession,
    networkMode: 'always', staleTime: Infinity, retry: false,
  })
  return { ...query, data: session, loadedAt: query.dataUpdatedAt ? new Date(query.dataUpdatedAt) : undefined }
}
