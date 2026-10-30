import type { AdminClubListParams } from './club.types'

/** Every club query uses this factory so domain invalidation is consistent. */
export const clubKeys = {
  all: ['club'] as const,
  detail: (id: string) => [...clubKeys.all, 'detail', id] as const,
  /** Admin directory; `adminLists()` matches every search and filter */
  adminLists: () => [...clubKeys.all, 'admin-list'] as const,
  adminList: (params: AdminClubListParams = {}) =>
    [...clubKeys.adminLists(), { q: params.q ?? '', access: params.access ?? 'all' }] as const,
  adminDetails: () => [...clubKeys.all, 'admin-detail'] as const,
  adminDetail: (id: string) => [...clubKeys.adminDetails(), id] as const,
  identityIndex: () => [...clubKeys.all, 'identity-index'] as const,
  nameRequests: () => [...clubKeys.all, 'name-requests'] as const,
}
