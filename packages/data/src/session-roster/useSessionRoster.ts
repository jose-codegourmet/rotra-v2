'use client'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSyncExternalStore } from 'react'
import { getSessionRoster } from './fetchers'
import { getPresenceBatch } from './presenceBatch'
import { sessionRosterKeys } from './queryKeys'
export function useSessionRoster(sessionId: string) {
  const client = useQueryClient()
  const { batch } = getPresenceBatch(client, sessionId)
  useSyncExternalStore(batch.subscribe, batch.getSnapshot, () => 0)
  const query = useQuery({
    queryKey: sessionRosterKeys.list(sessionId),
    queryFn: () => getSessionRoster(sessionId),
  })
  return {
    ...query,
    data: query.data
      ? {
          ...query.data,
          roster: query.data.roster.map((row) => ({
            ...row,
            present: batch.value(row.id, row.present),
            presentChangedAt: batch.changedAt(row.id) ?? row.presentChangedAt,
          })),
        }
      : undefined,
  }
}
