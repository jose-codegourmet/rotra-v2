'use client'
import { useQuery } from '@tanstack/react-query'
import { getClaimLink } from './fetchers'
import { playerAccountKeys } from './queryKeys'
export function useClaimLink(token: string) {
  return useQuery({
    queryKey: playerAccountKeys.claimLink(token),
    queryFn: ({ signal }) => getClaimLink(token, signal),
    networkMode: 'always',
    retry: false,
  })
}
