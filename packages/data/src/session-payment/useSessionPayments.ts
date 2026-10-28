'use client'
import { useQuery } from '@tanstack/react-query'
import { getSessionPayments } from './fetchers'
import { sessionPaymentKeys } from './queryKeys'
export function useSessionPayments(sessionId: string) {
  return useQuery({
    queryKey: sessionPaymentKeys.detail(sessionId),
    enabled: !!sessionId,
    queryFn: () => getSessionPayments(sessionId),
  })
}
