'use client'
import { useQuery } from '@tanstack/react-query'
import { getExemptionList } from './fetchers'
import { matchKeys } from './queryKeys'

/** The session's exemption list as roster ids; empty in real mode. */
export function useExemptionList(sessionId: string) {
  return useQuery({
    queryKey: matchKeys.exemption(sessionId),
    queryFn: () => getExemptionList(sessionId),
  })
}
