'use client'
import { useQuery } from '@tanstack/react-query'
import { getMyContactChangeRequest } from './fetchers'
import { contactChangeRequestKeys } from './queryKeys'
/** Pass the signed-in player's id; nothing is requested for visitors (null). */
export function useMyContactChangeRequest(signedInPlayerId: string | null) {
  return useQuery({
    queryKey: contactChangeRequestKeys.mine(signedInPlayerId ?? ''),
    queryFn: ({ signal }) => getMyContactChangeRequest(signal),
    enabled: Boolean(signedInPlayerId),
    networkMode: 'always',
    retry: false,
  })
}
