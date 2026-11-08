import type { PlayerCompareFilter } from './playerCompare.types'

export const playerCompareKeys = {
  all: ['player', 'compare'] as const,
  detail: (viewerId: string, otherId: string, filter: PlayerCompareFilter, page: number) =>
    ['player', 'compare', viewerId, otherId, filter, page] as const,
}
