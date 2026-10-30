'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { CONTACT_APPLYING_POLL_MS, invalidateContactRequestQueries, isApplying } from './adminCache'
import { getContactRequest } from './fetchers'
import { contactChangeRequestKeys } from './queryKeys'

/**
 * A-CONTACT-REVIEW: the request, its player and current contacts, and its checks while pending;
 * null = not found. Polls while the change is being applied; when the application settles, the
 * lists, counts, player contacts and record of actions refresh too.
 */
export function useContactRequest(requestId: string, options: { enabled?: boolean } = {}) {
  const client = useQueryClient()
  const query = useQuery({
    queryKey: contactChangeRequestKeys.detail(requestId),
    queryFn: ({ signal }) => getContactRequest(requestId, signal),
    enabled: options.enabled ?? true,
    refetchInterval: (current) =>
      isApplying(current.state.data?.status) ? CONTACT_APPLYING_POLL_MS : false,
  })
  const status = query.data?.status
  const previous = useRef(status)
  useEffect(() => {
    const settled = isApplying(previous.current) && status !== undefined && !isApplying(status)
    previous.current = status
    if (settled) void invalidateContactRequestQueries(client)
  }, [status, client])
  return query
}
