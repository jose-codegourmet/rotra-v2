'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { authKeys } from '../auth/queryKeys'
import { leaderboardKeys } from '../leaderboard/queryKeys'
import { playerKeys } from '../player/queryKeys'
import { completeClaim } from './fetchers'
import { playerAccountKeys } from './queryKeys'
/** Completing a registration signs the player in; their profile and account reads refresh. */
export function useCompleteClaim() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: completeClaim,
    networkMode: 'always',
    onSuccess: async (result) => {
      client.setQueryData(authKeys.session('player'), result.session)
      await Promise.all([
        client.invalidateQueries({ queryKey: playerKeys.all }),
        client.invalidateQueries({ queryKey: playerAccountKeys.all }),
        client.invalidateQueries({ queryKey: leaderboardKeys.all }),
      ])
    },
  })
}
