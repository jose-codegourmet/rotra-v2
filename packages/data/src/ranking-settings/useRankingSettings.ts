'use client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { leaderboardKeys } from '../leaderboard/queryKeys'
import { playerKeys } from '../player/queryKeys'
import { getRankingSettings, setRankingSettings } from './fetchers'
import { rankingSettingsKeys } from './queryKeys'
export function useRankingSettings() {
  return useQuery({
    queryKey: rankingSettingsKeys.current(),
    queryFn: ({ signal }) => getRankingSettings(signal),
    networkMode: 'always',
  })
}
export function useSetRankingSettings() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: setRankingSettings,
    onSuccess: async (value) => {
      client.setQueryData(rankingSettingsKeys.current(), value)
      await Promise.all([
        client.invalidateQueries({ queryKey: rankingSettingsKeys.all }),
        client.invalidateQueries({ queryKey: leaderboardKeys.all }),
        client.invalidateQueries({ queryKey: playerKeys.all }),
      ])
    },
  })
}
