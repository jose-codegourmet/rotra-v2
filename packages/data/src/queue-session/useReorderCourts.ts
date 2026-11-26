'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { reorderCourts } from './courts'
import type { getQueueSession } from './fetchers'
import { queueSessionKeys } from './queryKeys'

type SessionDetail = Awaited<ReturnType<typeof getQueueSession>>

/**
 * Reorder courts (owner decision, 2026-11-25), dragged in Settings. Variables: the session and the
 * full new order of its live courts. The session read takes the new order at once (so the drop
 * stays put), goes back to what it was if the save is refused, and every read refreshes after.
 * Needs internet; refused offline.
 */
export function useReorderCourts() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: { sessionId: string; courtIds: string[] }) => reorderCourts(input),
    onMutate: async ({ sessionId, courtIds }) => {
      const key = queueSessionKeys.detail(sessionId)
      await client.cancelQueries({ queryKey: key })
      const previous = client.getQueryData<SessionDetail>(key)
      if (previous) {
        const byId = new Map(previous.courts.map((c) => [c.id, c]))
        const courts = courtIds.flatMap((id, n) => {
          const court = byId.get(id)
          return court ? [{ ...court, position: n + 1 }] : []
        })
        // Only a list naming exactly the courts on screen is shown early; the save decides the rest.
        if (courts.length === previous.courts.length)
          client.setQueryData<SessionDetail>(key, { ...previous, courts })
      }
      return { previous }
    },
    onError: (_error, { sessionId }, context) => {
      if (context?.previous)
        client.setQueryData(queueSessionKeys.detail(sessionId), context.previous)
    },
    // Returning the promise keeps the mutation pending until every active query has refetched.
    onSettled: () =>
      client.invalidateQueries({ predicate: (query) => query.queryKey[0] !== 'auth' }),
  })
}
