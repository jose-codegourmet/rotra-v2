'use client'
import { useQuery } from '@tanstack/react-query'
import { getFinalizationStatus } from './fetchers'
import { queueSessionKeys } from './queryKeys'

const POLL_MS = 400
/**
 * Polls while a finalization is running so Q-FINALIZE-PROGRESS can recover after a lost response.
 * `poll` keeps polling before the first status exists (a Session done request still in flight).
 */
export function useFinalizationStatus(id: string, options?: { enabled?: boolean; poll?: boolean }) {
  return useQuery({
    queryKey: queueSessionKeys.finalization(id),
    queryFn: () => getFinalizationStatus(id),
    enabled: options?.enabled ?? true,
    refetchInterval: (query) =>
      query.state.data?.state === 'running' || options?.poll ? POLL_MS : false,
  })
}
