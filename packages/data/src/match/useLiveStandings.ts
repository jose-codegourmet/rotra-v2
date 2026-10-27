'use client'
import { useQuery } from '@tanstack/react-query'
import { getLiveStandings } from './fetchers'
import { matchKeys } from './queryKeys'
export function useLiveStandings(sessionId: string) {
  return useQuery({
    queryKey: [...matchKeys.all, ['LiveStandings', sessionId]],
    queryFn: () => getLiveStandings(sessionId),
  })
}
