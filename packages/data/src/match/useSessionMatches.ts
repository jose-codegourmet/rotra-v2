'use client'
import { useQuery } from '@tanstack/react-query'
import { getSessionMatches } from './fetchers'
import { matchKeys } from './queryKeys'
export function useSessionMatches(sessionId: string) {
  return useQuery({
    queryKey: [...matchKeys.all, ['SessionMatches', sessionId]],
    queryFn: () => getSessionMatches(sessionId),
  })
}
