'use client'
import { useQuery } from '@tanstack/react-query'
import { getMatchPage } from './fetchers'
import { matchPageKeys } from './queryKeys'

/** The public match page (`/matches/[matchId]`); null when the match is unknown or not public. */
export function useMatchPage(matchId: string) {
  return useQuery({
    queryKey: matchPageKeys.page(matchId),
    queryFn: ({ signal }) => getMatchPage(matchId, signal),
    enabled: Boolean(matchId),
    networkMode: 'always',
    retry: false,
  })
}
