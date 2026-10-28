'use client'
import { useQuery } from '@tanstack/react-query'
import { getSyncStatus } from './fetchers'
import { syncKeys } from './queryKeys'
export function useSyncStatus() {
  return useQuery({ queryKey: syncKeys.status(), queryFn: () => getSyncStatus() })
}
