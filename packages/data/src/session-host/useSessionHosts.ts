'use client'
import { useQuery } from '@tanstack/react-query'
import { getSessionHosts } from './fetchers'
import { sessionHostKeys } from './queryKeys'

/** Q-SETUP › Hosts (#1004): the session's current hosts. An empty id reads nothing. */
export function useSessionHosts(sessionId: string) {
  return useQuery({
    queryKey: sessionHostKeys.list(sessionId),
    queryFn: () => getSessionHosts(sessionId),
    enabled: !!sessionId,
  })
}
