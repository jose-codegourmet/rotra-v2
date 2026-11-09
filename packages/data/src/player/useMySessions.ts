'use client'
import { useQuery } from '@tanstack/react-query'
import { getMySessions } from './mySessions'
import { playerKeys } from './queryKeys'
export function useMySessions(id: string | null) {
  return useQuery({
    queryKey: playerKeys.mySessions(id ?? ''),
    queryFn: ({ signal }) => getMySessions(signal),
    enabled: !!id,
    networkMode: 'always',
    retry: false,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })
}
