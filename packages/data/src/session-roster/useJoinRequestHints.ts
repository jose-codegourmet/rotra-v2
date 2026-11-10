'use client'
import { useQuery } from '@tanstack/react-query'
import { getJoinRequestHints } from './requestDecisions'

/**
 * Requests › Join hints per pending request id: `sharedRank` (signed-in Players), `phoneMatch`
 * (“Is this NAME from your saved players?”) and `linked` (“Linked to NAME …”). Refreshed with the
 * other queries after every mutation.
 */
export function useJoinRequestHints(sessionId: string) {
  return useQuery({
    queryKey: ['session-roster', 'join-request-hints', sessionId] as const,
    queryFn: () => getJoinRequestHints(sessionId),
    enabled: sessionId !== '',
  })
}
