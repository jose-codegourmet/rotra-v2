'use client'
import { useQuery } from '@tanstack/react-query'
import { getMyJoinRequest } from './fetchers'
import { publicSessionKeys } from './queryKeys'
/** This visitor's own join request on the page, or null when they have not sent one. */
export function useMyJoinRequest(slug: string) {
  return useQuery({
    queryKey: publicSessionKeys.myRequest(slug),
    queryFn: () => getMyJoinRequest(slug),
    enabled: slug !== '',
  })
}
