'use client'

import { useQueries } from '@tanstack/react-query'
import type { AdminAuditEvent, AdminAuditTargetType } from './adminAudit.types'
import { listAuditEvents } from './fetchers'
import { adminAuditKeys } from './queryKeys'

/**
 * One "Record of actions" across several records of a type, newest first: the player detail shows
 * the lines for each of the player's contact-change requests. Shares the per-target cache with
 * useAuditEvents, so the same invalidations refresh it. `data` stays undefined until every target
 * has answered; `error` is the first failure.
 */
export function useAuditEventsForTargets(params: {
  targetType: AdminAuditTargetType
  targetIds: string[]
}) {
  return useQueries({
    queries: params.targetIds.map((targetId) => ({
      queryKey: adminAuditKeys.byTarget(params.targetType, targetId),
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        listAuditEvents({ targetType: params.targetType, targetId }, signal),
    })),
    combine: (results) => {
      const failed = results.find((result) => result.isError)
      const loaded = results.every((result) => result.data !== undefined)
      return {
        data: loaded
          ? results
              .flatMap((result) => result.data as AdminAuditEvent[])
              .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
          : undefined,
        error: failed?.error ?? null,
        isError: Boolean(failed),
        isFetching: results.some((result) => result.isFetching),
        refetch: () => Promise.all(results.map((result) => result.refetch())),
      }
    },
  })
}
