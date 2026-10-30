'use client'

import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { CONTACT_APPLYING_POLL_MS, isApplying } from './adminCache'
import type { ContactRequestListParams } from './contactChangeRequest.types'
import { listContactRequests } from './fetchers'
import { contactChangeRequestKeys } from './queryKeys'

/**
 * A-CONTACT-REQUESTS rows newest first with per-status counts; pass `playerId` for one player's
 * requests. Polls while a row is being applied. `enabled: false` until the owner session is confirmed.
 */
export function useContactRequests(
  params: ContactRequestListParams = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: contactChangeRequestKeys.list(params),
    queryFn: ({ signal }) => listContactRequests(params, signal),
    enabled: options.enabled ?? true,
    placeholderData: keepPreviousData,
    refetchInterval: (query) =>
      query.state.data?.rows.some((row) => isApplying(row.status))
        ? CONTACT_APPLYING_POLL_MS
        : false,
  })
}
