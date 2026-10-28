'use client'
import { useQuery } from '@tanstack/react-query'
import { getSessionIntegrity } from './fetchers'
import { syncKeys } from './queryKeys'
export function useSessionIntegrity(sessionId: string) { return useQuery({ queryKey: syncKeys.integrity(sessionId), queryFn: () => getSessionIntegrity(sessionId), enabled: !!sessionId }) }
