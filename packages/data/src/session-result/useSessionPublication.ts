'use client'
import { useQuery } from '@tanstack/react-query'
import { getSessionPublication } from './fetchers'
import { sessionResultKeys } from './queryKeys'
export function useSessionPublication(id: string) {
  return useQuery({
    queryKey: sessionResultKeys.publication(id),
    queryFn: () => getSessionPublication(id),
  })
}
