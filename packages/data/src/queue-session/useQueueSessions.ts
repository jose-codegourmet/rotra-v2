'use client'
import { useQuery } from '@tanstack/react-query'
import { getQueueSessions } from './fetchers'
import { queueSessionKeys } from './queryKeys'
export function useQueueSessions(clubId?: string) {
  return useQuery({
    queryKey: [...queueSessionKeys.all, 'useQueueSessions', clubId],
    queryFn: () => getQueueSessions(clubId),
  })
}
