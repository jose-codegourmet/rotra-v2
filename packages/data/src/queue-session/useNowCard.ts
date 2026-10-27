'use client'
import { useQuery } from '@tanstack/react-query'
import { getNowCard } from './fetchers'
import { queueSessionKeys } from './queryKeys'
export function useNowCard(clubId?: string) {
  return useQuery({
    queryKey: [...queueSessionKeys.all, 'useNowCard', clubId],
    queryFn: () => getNowCard(clubId),
  })
}
