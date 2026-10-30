import type { ContactRequestListParams } from './contactChangeRequest.types'

/** Every contact-change query (Player and Admin) uses this factory so invalidation is consistent. */
export const contactChangeRequestKeys = {
  all: ['contact-change-request'] as const,
  mine: (playerId: string) => ['contact-change-request', 'mine', playerId] as const,
  /** Admin review list; `lists()` matches every status filter and player scope */
  lists: () => [...contactChangeRequestKeys.all, 'list'] as const,
  list: (params: ContactRequestListParams = {}) =>
    [
      ...contactChangeRequestKeys.lists(),
      { status: params.status ?? 'all', playerId: params.playerId ?? null },
    ] as const,
  details: () => [...contactChangeRequestKeys.all, 'detail'] as const,
  detail: (requestId: string) => [...contactChangeRequestKeys.details(), requestId] as const,
  counts: () => [...contactChangeRequestKeys.all, 'counts'] as const,
}
