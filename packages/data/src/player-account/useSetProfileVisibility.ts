'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { clubPageKeys } from '../club-page/queryKeys'
import { leaderboardKeys } from '../leaderboard/queryKeys'
import { playerKeys } from '../player/queryKeys'
import { publicSessionKeys } from '../public-session/queryKeys'
import { playerAccountKeys } from './queryKeys'
import { setProfileVisibility } from './visibilitySettings'
/** Saves the level; every projection that masks names is refetched once the server confirmed it. */
export function useSetProfileVisibility() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: setProfileVisibility,
    networkMode: 'always',
    onSuccess: (account) =>
      Promise.all([
        client.invalidateQueries({ queryKey: playerAccountKeys.me(account.playerId) }),
        client.invalidateQueries({ queryKey: playerKeys.all }),
        client.invalidateQueries({ queryKey: leaderboardKeys.all }),
        client.invalidateQueries({ queryKey: publicSessionKeys.all }),
        client.invalidateQueries({ queryKey: clubPageKeys.all }),
      ]),
  })
}
