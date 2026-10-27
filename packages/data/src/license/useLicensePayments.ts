'use client'
import { useQuery } from '@tanstack/react-query'
import { getLicensePayments } from './fetchers'
import { licenseKeys } from './queryKeys'
export function useLicensePayments() {
  return useQuery({
    queryKey: [...licenseKeys.all, 'useLicensePayments'],
    queryFn: () => getLicensePayments(),
  })
}
