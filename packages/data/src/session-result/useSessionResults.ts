'use client'
import { useQuery } from '@tanstack/react-query'
import { getSessionResults } from './fetchers'
import { sessionResultKeys } from './queryKeys'
export function useSessionResults(id: string) {
  return useQuery({
    queryKey: sessionResultKeys.snapshot(id),
    queryFn: () => getSessionResults(id),
  })
}
