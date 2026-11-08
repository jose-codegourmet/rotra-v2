'use client'

import { useQuery } from '@tanstack/react-query'
import { getPlatformSales } from './fetchers'
import { salesKeys } from './queryKeys'
import type { SalesPeriod } from './sales.types'

/**
 * A-SALES: revenue, sessions started and matches played for one period, with the lists.
 * `enabled: false` keeps a privileged read from running before the platform-owner session is confirmed.
 */
export function usePlatformSales(period: SalesPeriod, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: salesKeys.platform(period),
    queryFn: ({ signal }) => getPlatformSales(period, signal),
    enabled: options.enabled ?? true,
  })
}
