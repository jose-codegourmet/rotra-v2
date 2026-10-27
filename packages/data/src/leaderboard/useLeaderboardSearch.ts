'use client'
import { useQuery } from '@tanstack/react-query'
import { searchLeaderboard } from './fetchers'
import { leaderboardKeys } from './queryKeys'
export function useLeaderboardSearch(query: string) {
  return useQuery({ queryKey: leaderboardKeys.search(query), queryFn: ({ signal }) => searchLeaderboard(query, signal), enabled: Boolean(query.trim()) && !/^RTR-/i.test(query.trim()), networkMode: 'always', retry: false })
}
