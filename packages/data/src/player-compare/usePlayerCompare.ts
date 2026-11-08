'use client'
import { useQuery } from '@tanstack/react-query'
import { getPlayerCompare } from './fetchers'
import type { PlayerCompareOptions } from './playerCompare.types'
import { playerCompareKeys } from './queryKeys'

export function usePlayerCompare(
  viewerId: string,
  otherId: string,
  options: PlayerCompareOptions = {},
) {
  const { filter = 'all', page = 0 } = options
  return useQuery({
    queryKey: playerCompareKeys.detail(viewerId, otherId, filter, page),
    queryFn: ({ signal }) => getPlayerCompare(viewerId, otherId, { filter, page }, signal),
    enabled: Boolean(viewerId && otherId && viewerId !== otherId),
    networkMode: 'always',
    retry: false,
  })
}
