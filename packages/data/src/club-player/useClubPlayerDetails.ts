'use client'
import { useQuery } from '@tanstack/react-query'
import { getClubPlayerDetails } from './details'
import { clubPlayerKeys } from './queryKeys'
export function useClubPlayerDetails(id: string | null) {
  return useQuery({
    queryKey: [...clubPlayerKeys.all, 'details', id ?? ''],
    queryFn: () => getClubPlayerDetails(id ?? ''),
    enabled: id !== null,
  })
}
