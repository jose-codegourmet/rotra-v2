import type { AdminPlayerListParams } from './adminPlayer.types'

/** Every Admin player query uses this factory so domain invalidation is consistent. */
export const adminPlayerKeys = {
  all: ['admin-player'] as const,
  /** `lists()` matches every search, filter and limit */
  lists: () => [...adminPlayerKeys.all, 'list'] as const,
  list: (params: AdminPlayerListParams = {}) =>
    [...adminPlayerKeys.lists(), { ...params, q: params.q?.trim() ?? '' }] as const,
  selection: (ids: string[]) => [...adminPlayerKeys.all, 'selection', [...ids].sort()] as const,
  games: (id: string) => [...adminPlayerKeys.all, 'games', id] as const,
  details: () => [...adminPlayerKeys.all, 'detail'] as const,
  detail: (id: string) => [...adminPlayerKeys.details(), id] as const,
  /** A-PLAYER-EDIT's read (profile and account fields) */
  edit: (id: string) => [...adminPlayerKeys.all, 'edit', id] as const,
}
