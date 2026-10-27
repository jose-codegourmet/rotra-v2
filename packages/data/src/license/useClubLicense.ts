'use client'
import { useQuery } from '@tanstack/react-query'
import { getClubLicense } from './fetchers'
import { licenseKeys } from './queryKeys'
export function useClubLicense() {
  return useQuery({
    queryKey: [...licenseKeys.all, 'useClubLicense'],
    queryFn: () => getClubLicense(),
  })
}
