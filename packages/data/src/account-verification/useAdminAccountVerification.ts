'use client'
import { useQuery } from '@tanstack/react-query'
import { getAdminAccountVerification } from './fetchers'
import { accountVerificationKeys } from './queryKeys'

export function useAdminAccountVerification(playerId: string, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: accountVerificationKeys.admin(playerId),
    queryFn: ({ signal }) => getAdminAccountVerification(playerId, signal),
    enabled: Boolean(playerId) && (options.enabled ?? true),
    retry: false,
  })
}
