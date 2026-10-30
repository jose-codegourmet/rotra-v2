'use client'

import { useQuery } from '@tanstack/react-query'
import { CONTACT_APPLYING_POLL_MS } from './adminCache'
import { getContactRequestCounts } from './fetchers'
import { contactChangeRequestKeys } from './queryKeys'

/**
 * Whole-queue counts; `attention` (waiting + needs attention) is the Admin nav count. Polls while a
 * change is being applied, since a failure adds to it. `enabled: false` until the owner is confirmed.
 */
export function useContactRequestCounts(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: contactChangeRequestKeys.counts(),
    queryFn: ({ signal }) => getContactRequestCounts(signal),
    enabled: options.enabled ?? true,
    refetchInterval: (query) =>
      (query.state.data?.applying ?? 0) > 0 ? CONTACT_APPLYING_POLL_MS : false,
  })
}
