'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useDebouncedBatch } from '../batch/useDebouncedBatch'
import type { getSessionRoster } from './fetchers'
import { getPresenceBatch, type PresenceBatchCallbacks } from './presenceBatch'
import { sessionRosterKeys } from './queryKeys'

/** One desired-state batch shared by preparation and the console; no grid lock while saving. */
export function useSetPresenceMany(sessionId: string, callbacks: PresenceBatchCallbacks = {}) {
  const client = useQueryClient()
  const shared = getPresenceBatch(client, sessionId)
  const batch = useDebouncedBatch(shared.batch)
  return {
    pending: batch.pendingKeys(),
    flush: batch.flush,
    set(rosterId: string, present: boolean) {
      const accepted = client
        .getQueryData<Awaited<ReturnType<typeof getSessionRoster>>>(
          sessionRosterKeys.list(sessionId),
        )
        ?.roster.find((r) => r.id === rosterId)
      if (!accepted) return
      shared.owner.callbacks = callbacks
      batch.set(rosterId, present, accepted.present)
    },
  }
}
