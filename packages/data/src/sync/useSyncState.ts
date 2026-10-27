'use client'
import { useQuery } from '@tanstack/react-query'
import { getSyncState } from './fetchers'
import { syncKeys } from './queryKeys'
export function useSyncState() {
  return useQuery({ queryKey: [...syncKeys.all, 'state'], queryFn: () => getSyncState() })
}
