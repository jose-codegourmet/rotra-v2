'use client'
import { useQuery } from '@tanstack/react-query'
import { getPublicPaymentStatus } from './fetchers'
import { publicSessionKeys } from './queryKeys'

/**
 * The confirmed roster's payments for the public page's Share payment status (#1010). `data` is
 * null where the session or the mode has none (cancelled, invalid, real mode): hide the button.
 */
export function usePublicPaymentStatus(slug: string, enabled = true) {
  return useQuery({
    queryKey: publicSessionKeys.paymentStatus(slug),
    queryFn: () => getPublicPaymentStatus(slug),
    enabled: enabled && slug !== '',
  })
}
