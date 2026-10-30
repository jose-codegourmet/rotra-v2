import type { QueryClient } from '@tanstack/react-query'
import { adminAuditKeys } from '../admin-audit/queryKeys'
import { adminPlayerKeys } from '../admin-player/queryKeys'
import { contactChangeRequestKeys } from './queryKeys'

/** Poll while the provider applies a change (TanStack refetch, never a realtime channel). */
export const CONTACT_APPLYING_POLL_MS = 1000

export function isApplying(status: string | undefined) {
  return status === 'applying' || status === 'approved'
}

/**
 * After any Admin contact-change write or settled application: the request lists, details and
 * counts, the players' contacts (detail and phone/email search) and the record of actions.
 */
export function invalidateContactRequestQueries(client: QueryClient) {
  return Promise.all([
    client.invalidateQueries({ queryKey: contactChangeRequestKeys.all }),
    client.invalidateQueries({ queryKey: adminPlayerKeys.all }),
    client.invalidateQueries({ queryKey: adminAuditKeys.all }),
  ])
}
