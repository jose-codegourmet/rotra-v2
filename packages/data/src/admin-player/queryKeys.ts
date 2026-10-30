import { ADMIN_PLAYER_PAGE_SIZE } from './adminPlayer.rules'
import type { AdminPlayerListParams } from './adminPlayer.types'

/** Every Admin player query uses this factory so domain invalidation is consistent. */
export const adminPlayerKeys = {
  all: ['admin-player'] as const,
  /** `lists()` matches every search, filter and limit */
  lists: () => [...adminPlayerKeys.all, 'list'] as const,
  list: (params: AdminPlayerListParams = {}) =>
    [
      ...adminPlayerKeys.lists(),
      {
        q: params.q?.trim() ?? '',
        account: params.account ?? 'all',
        limit: params.limit ?? ADMIN_PLAYER_PAGE_SIZE,
      },
    ] as const,
  details: () => [...adminPlayerKeys.all, 'detail'] as const,
  detail: (id: string) => [...adminPlayerKeys.details(), id] as const,
}
