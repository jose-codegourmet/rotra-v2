'use client'
import { useQuery } from '@tanstack/react-query'
import { getMyAccount } from './fetchers'
import { playerAccountKeys } from './queryKeys'
/** Pass the signed-in player's id; nothing is requested for visitors (null). */
export function useMyAccount(signedInPlayerId: string | null) {
  return useQuery({
    queryKey: playerAccountKeys.me(signedInPlayerId ?? ''),
    queryFn: ({ signal }) => getMyAccount(signal),
    enabled: Boolean(signedInPlayerId),
    networkMode: 'always',
    retry: false,
  })
}
