'use client'
import { useQuery } from '@tanstack/react-query'
import { getSessionCostEstimate } from './fetchers'
import { sessionCostKeys } from './queryKeys'
export function useSessionCostEstimate(sessionId: string) {
  return useQuery({
    queryKey: sessionCostKeys.detail(sessionId),
    enabled: !!sessionId,
    queryFn: () => getSessionCostEstimate(sessionId),
  })
}
