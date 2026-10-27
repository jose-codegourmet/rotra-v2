'use client'
import { useQuery } from '@tanstack/react-query'
import { findPlayerByRtrId } from './fetchers'
import { playerKeys } from './queryKeys'
export function useFindPlayerByRtrId(rtrId: string) {
  return useQuery({ queryKey: playerKeys.byRtrId(rtrId), queryFn: ({ signal }) => findPlayerByRtrId(rtrId, signal), enabled: Boolean(rtrId), networkMode: 'always', retry: false })
}
