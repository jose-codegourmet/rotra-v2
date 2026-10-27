'use client'
import { useQuery } from '@tanstack/react-query'
import { getQueueSession } from './fetchers'
import { queueSessionKeys } from './queryKeys'
export function useQueueSession(id: string) {
  return useQuery({
    queryKey: [...queueSessionKeys.all, 'detail', id],
    queryFn: () => getQueueSession(id),
  })
}
