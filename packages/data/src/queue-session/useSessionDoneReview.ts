'use client'
import { useQuery } from '@tanstack/react-query'
import { getSessionDoneReview } from './fetchers'
import { queueSessionKeys } from './queryKeys'
export function useSessionDoneReview(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queueSessionKeys.doneReview(id),
    queryFn: () => getSessionDoneReview(id),
    enabled: options?.enabled ?? true,
  })
}
