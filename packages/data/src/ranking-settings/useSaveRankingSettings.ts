'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { adminPlayerKeys } from '../admin-player/queryKeys'
import { saveRankingSettings } from './fetchers'
import { rankingSettingsKeys } from './queryKeys'
import type { SaveRankingSettingsInput } from './rankingSettings.types'

/**
 * D-CONFIG › Save configuration: mutate({ draft, baseVersion }) → the saved RankingPolicyVersion.
 * A ConflictError (kind 'conflict') carries the version in effect as `current`; keep the draft and
 * show ConfigConflictNotice. Settled either way, since a conflict can mean another version was saved;
 * Admin players re-read the requirement for their rank status.
 */
export function useSaveRankingSettings() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: SaveRankingSettingsInput) => saveRankingSettings(input),
    networkMode: 'always',
    retry: false,
    onSettled: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: rankingSettingsKeys.all }),
        client.invalidateQueries({ queryKey: adminPlayerKeys.all }),
      ]),
  })
}
