'use client'
import { useQuery } from '@tanstack/react-query'
import { playerKeys } from './queryKeys'
import { getPlayerProfileShareData } from './shareData'
export function usePlayerProfileShareData(id: string | null, enabled = true) {
  return useQuery({
    queryKey: playerKeys.profileShare(id ?? ''),
    queryFn: ({ signal }) => getPlayerProfileShareData(id ?? '', signal),
    enabled: !!id && enabled,
    retry: false,
    networkMode: 'always',
  })
}
