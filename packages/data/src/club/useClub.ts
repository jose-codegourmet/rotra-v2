'use client'

import { useQuery } from '@tanstack/react-query'
import { getClub } from './fetchers'
import { clubKeys } from './queryKeys'

/** Example domain hook: components receive query state without importing the store or fetcher. */
export function useClub(id: string) {
  return useQuery({
    queryKey: clubKeys.detail(id),
    queryFn: ({ signal }) => getClub(id, signal),
  })
}
