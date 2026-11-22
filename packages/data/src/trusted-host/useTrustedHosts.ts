'use client'
import { useQuery } from '@tanstack/react-query'
import { getTrustedHosts } from './fetchers'
import { trustedHostKeys } from './queryKeys'

/** Club settings › Trusted hosts: the club's current trusted hosts (D-2026-11-22-01). */
export function useTrustedHosts(clubId: string) {
  return useQuery({ queryKey: trustedHostKeys.list(clubId), queryFn: () => getTrustedHosts() })
}
