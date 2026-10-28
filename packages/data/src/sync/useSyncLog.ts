'use client'
import { useQuery } from '@tanstack/react-query'
import { getSyncLog } from './fetchers'
import { syncKeys } from './queryKeys'
export function useSyncLog() { return useQuery({ queryKey: syncKeys.log(), queryFn: () => getSyncLog() }) }
