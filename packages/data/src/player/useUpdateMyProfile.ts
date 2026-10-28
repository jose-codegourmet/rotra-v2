'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { leaderboardKeys } from '../leaderboard/queryKeys'
import { updateMyProfile } from './fetchers'
import { playerKeys } from './queryKeys'
export function useUpdateMyProfile() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: updateMyProfile,
    networkMode: 'always',
    // Names and nicknames also appear on rank detail and every leaderboard view.
    onSuccess: (profile) =>
      Promise.all([
        client.invalidateQueries({ queryKey: playerKeys.profile(profile.playerId) }),
        client.invalidateQueries({ queryKey: playerKeys.rank(profile.playerId) }),
        client.invalidateQueries({ queryKey: leaderboardKeys.all }),
      ]),
  })
}
