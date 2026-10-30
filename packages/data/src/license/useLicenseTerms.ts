'use client'

import { useQuery } from '@tanstack/react-query'
import { listLicenseTerms } from './fetchers'
import { licenseKeys } from './queryKeys'

/** A-LICENSE payment history: every term recorded for the club, newest first. */
export function useLicenseTerms(clubId: string) {
  return useQuery({
    queryKey: licenseKeys.terms(clubId),
    queryFn: ({ signal }) => listLicenseTerms(clubId, signal),
  })
}
