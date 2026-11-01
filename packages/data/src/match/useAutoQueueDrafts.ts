'use client'
import { useQuery } from '@tanstack/react-query'
import { getAutoQueueDrafts } from './autoQueue.mutations'
import { matchKeys } from './queryKeys'
export function useAutoQueueDrafts(sessionId: string) {
  return useQuery({ queryKey: matchKeys.drafts(sessionId), queryFn: () => getAutoQueueDrafts(sessionId) })
}
