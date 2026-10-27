'use client'
import { useQuery } from '@tanstack/react-query'
import { getSessionRoster } from './fetchers'
import { sessionRosterKeys } from './queryKeys'
export function useSessionRoster(sessionId: string) {
  return useQuery({
    queryKey: [...sessionRosterKeys.all, 'list', sessionId],
    queryFn: () => getSessionRoster(sessionId),
  })
}
