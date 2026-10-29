'use client'

import { useQuery } from '@tanstack/react-query'
import type { AdminAuditTargetType } from './adminAudit.types'
import { listAuditEvents } from './fetchers'
import { adminAuditKeys } from './queryKeys'

/** A record's "Record of actions", newest first (club Activity tab, player and request logs). */
export function useAuditEvents(params: { targetType: AdminAuditTargetType; targetId: string }) {
  return useQuery({
    queryKey: adminAuditKeys.byTarget(params.targetType, params.targetId),
    queryFn: ({ signal }) => listAuditEvents(params, signal),
  })
}
