'use client'
import { useQuery } from '@tanstack/react-query'
import { getSessionRecordHistory } from './fetchers'
import { queueSessionKeys } from './queryKeys'
export function useSessionRecordHistory(id: string) {
  return useQuery({
    queryKey: queueSessionKeys.recordHistory(id),
    queryFn: () => getSessionRecordHistory(id),
  })
}
