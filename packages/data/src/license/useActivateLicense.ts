'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { invalidateLicenseQueries } from './adminCache'
import { activateLicense } from './fetchers'
import type { ActivateLicenseInput } from './license.types'

/**
 * D-LICENSE › Activate/Renew license. Keep one sourceCommandId per review so a retry returns the term
 * already recorded. A MockError of kind 'timeout' means the reply was lost and the term may be saved:
 * show the operation notice and use useCheckLicenseOperation. Settled either way, since a lost reply
 * can still have changed access.
 */
export function useActivateLicense() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: ActivateLicenseInput) => activateLicense(input),
    networkMode: 'always',
    retry: false,
    onSettled: () => invalidateLicenseQueries(client),
  })
}
