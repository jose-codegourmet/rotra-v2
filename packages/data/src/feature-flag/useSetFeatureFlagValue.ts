'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { adminAuditKeys } from '../admin-audit/queryKeys'
import type { SetFeatureFlagValueInput } from './featureFlag.types'
import { setFeatureFlagValue } from './fetchers'
import { featureFlagKeys } from './queryKeys'

/**
 * D-FLAG › Turn on / Turn off: mutate({ key, on, revision }) → the saved FeatureFlag. A
 * ConflictError (kind 'conflict') carries the flag as it is now in `current`. Settled either way,
 * since a conflict means the flag changed elsewhere; an offline failure leaves the value unchanged.
 */
export function useSetFeatureFlagValue() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: SetFeatureFlagValueInput) => setFeatureFlagValue(input),
    networkMode: 'always',
    retry: false,
    onSettled: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: featureFlagKeys.all }),
        client.invalidateQueries({ queryKey: adminAuditKeys.all }),
      ]),
  })
}
