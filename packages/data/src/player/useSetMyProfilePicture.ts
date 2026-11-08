'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { leaderboardKeys } from '../leaderboard/queryKeys'
import { setMyProfilePicture } from './fetchers'
import { playerKeys } from './queryKeys'

export function useSetMyProfilePicture() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: setMyProfilePicture,
    networkMode: 'always',
    onSuccess: (profile) =>
      Promise.all([
        client.invalidateQueries({ queryKey: playerKeys.profile(profile.playerId) }),
        client.invalidateQueries({ queryKey: leaderboardKeys.all }),
      ]),
  })
}
