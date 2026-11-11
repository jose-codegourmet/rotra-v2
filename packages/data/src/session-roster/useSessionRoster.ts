'use client'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSyncExternalStore } from 'react'
import { useDebouncedBatch } from '../batch/useDebouncedBatch'
import { getSessionRoster } from './fetchers'
import { getPresenceBatch } from './presenceBatch'
import { sessionRosterKeys } from './queryKeys'
import { getRosterBatch, overlayRoster } from './rosterBatch'

/**
 * Accepted roster data with two overlays: the pending roster burst (adds, removes and request
 * decisions, #718) and the pending presence batch (#324). Both survive refetches until accepted.
 */
export function useSessionRoster(sessionId: string) {
  const client = useQueryClient()
  const { batch } = getPresenceBatch(client, sessionId)
  useSyncExternalStore(batch.subscribe, batch.getSnapshot, () => 0)
  const roster = getRosterBatch(client, sessionId)
  // Subscribes to the burst and flushes it on page hide and exit, wherever the roster is shown.
  useDebouncedBatch(roster.batch)
  const query = useQuery({
    queryKey: sessionRosterKeys.list(sessionId),
    queryFn: () => getSessionRoster(sessionId),
  })
  if (!query.data) return { ...query, data: undefined }
  const overlaid = overlayRoster(sessionId, query.data, roster.pendingOps(), roster.resolved)
  return {
    ...query,
    data: {
      ...overlaid,
      roster: overlaid.roster.map((row) => ({
        ...row,
        present: batch.value(row.id, row.present),
        presentChangedAt: batch.changedAt(row.id) ?? row.presentChangedAt,
      })),
    },
  }
}
