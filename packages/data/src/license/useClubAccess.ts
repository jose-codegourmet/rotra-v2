'use client'
import { useQuery } from '@tanstack/react-query'
import { getClubAccess } from './fetchers'
import { licenseKeys } from './queryKeys'
export function useClubAccess() {
  return useQuery({
    queryKey: [...licenseKeys.all, 'useClubAccess'],
    queryFn: () => getClubAccess(),
  })
}
