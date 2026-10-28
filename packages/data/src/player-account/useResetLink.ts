'use client'
import { useQuery } from '@tanstack/react-query'
import { getResetLink } from './fetchers'
import { playerAccountKeys } from './queryKeys'
export function useResetLink(token: string) {
  return useQuery({
    queryKey: playerAccountKeys.resetLink(token),
    queryFn: ({ signal }) => getResetLink(token, signal),
    networkMode: 'always',
    retry: false,
  })
}
