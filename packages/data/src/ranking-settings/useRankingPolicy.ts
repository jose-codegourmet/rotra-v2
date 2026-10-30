'use client'

import { useQuery } from '@tanstack/react-query'
import { getRankingPolicy } from './fetchers'
import { rankingSettingsKeys } from './queryKeys'

/**
 * A-RANK-CONFIG: { effective, versions } (versions oldest first, as RankingInEffectCard takes them).
 * `enabled: false` keeps a privileged read from running before the platform-owner session is confirmed.
 */
export function useRankingPolicy(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: rankingSettingsKeys.policy(),
    queryFn: ({ signal }) => getRankingPolicy(signal),
    enabled: options.enabled ?? true,
  })
}
