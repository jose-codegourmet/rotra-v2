'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { adminAuditKeys } from '../admin-audit/queryKeys'
import type { AddFeatureFlagInput } from './featureFlag.types'
import { addFeatureFlag } from './fetchers'
import { featureFlagKeys } from './queryKeys'

/**
 * A-ADD-FLAG › Add flag: mutate(values) → the new FeatureFlag. A MockError's fieldErrors are keyed
 * like AddFlagForm (a taken name or key comes back as kind 'conflict'). networkMode 'always' lets an
 * offline attempt reach the fetcher and fail with the offline message rather than wait silently.
 */
export function useAddFeatureFlag() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: AddFeatureFlagInput) => addFeatureFlag(input),
    networkMode: 'always',
    retry: false,
    onSuccess: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: featureFlagKeys.all }),
        client.invalidateQueries({ queryKey: adminAuditKeys.all }),
      ]),
  })
}
