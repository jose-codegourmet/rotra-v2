'use client'
import { useQuery } from '@tanstack/react-query'
import { getSessionRecord } from './fetchers'
import { queueSessionKeys } from './queryKeys'
export function useSessionRecord(id: string) {
  return useQuery({
    queryKey: queueSessionKeys.record(id),
    queryFn: () => getSessionRecord(id),
  })
}
