'use client'
import { useQuery } from '@tanstack/react-query'
import { sessionRosterKeys } from './queryKeys'
import { getJoinRequestHints } from './requestDecisions'

/**
 * Requests › Join hints per pending request id: `sharedRank` (signed-in Players). Refreshed with
 * the other queries after every mutation.
 */
export function useJoinRequestHints(sessionId: string) {
  return useQuery({
    queryKey: sessionRosterKeys.joinRequestHints(sessionId),
    queryFn: () => getJoinRequestHints(sessionId),
    enabled: sessionId !== '',
  })
}
