'use client'
import { useQuery } from '@tanstack/react-query'
import { getMyAccountVerification } from './fetchers'
import { accountVerificationKeys } from './queryKeys'

export function useMyAccountVerification(signedInPlayerId: string | null) {
  const playerId = signedInPlayerId ?? ''
  return useQuery({
    queryKey: accountVerificationKeys.owner(playerId),
    queryFn: ({ signal }) => getMyAccountVerification(playerId, signal),
    enabled: Boolean(signedInPlayerId),
    networkMode: 'always',
    retry: false,
  })
}
