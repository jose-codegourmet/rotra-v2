'use client'
import { useQuery } from '@tanstack/react-query'
import { getFinalizationStatus } from './fetchers'
import { queueSessionKeys } from './queryKeys'
const POLL_MS = 400
/** Polls while a finalization is running so Q-FINALIZE-PROGRESS can recover after a lost response. */
export function useFinalizationStatus(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queueSessionKeys.finalization(id),
    queryFn: () => getFinalizationStatus(id),
    enabled: options?.enabled ?? true,
    refetchInterval: (query) => (query.state.data?.state === 'running' ? POLL_MS : false),
  })
}
