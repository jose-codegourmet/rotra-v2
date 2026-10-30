'use client'

import { useQuery } from '@tanstack/react-query'
import { listFeatureFlags } from './fetchers'
import { featureFlagKeys } from './queryKeys'

/**
 * A-FEATURE-FLAGS: the catalog in list order ([] on a fresh mock store). `enabled: false` keeps a
 * privileged read from running before the platform-owner session is confirmed.
 */
export function useFeatureFlags(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: featureFlagKeys.list(),
    queryFn: ({ signal }) => listFeatureFlags(signal),
    enabled: options.enabled ?? true,
  })
}
