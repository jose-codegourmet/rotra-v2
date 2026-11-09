'use client'
import { useQuery } from '@tanstack/react-query'
import { playerKeys } from './queryKeys'
import { getPlayerShareData } from './shareData'
export function usePlayerShareData(id: string | null, sessionId?: string, enabled = true) {
  return useQuery({
    queryKey: playerKeys.share(id ?? '', sessionId),
    queryFn: ({ signal }) => getPlayerShareData(id ?? '', sessionId, signal),
    enabled: !!id && enabled,
    retry: false,
    networkMode: 'always',
  })
}
