'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { playerAccountKeys } from '../player-account/queryKeys'
import { setMyProfileBanner } from './fetchers'
import { playerKeys } from './queryKeys'

/** mutate(bannerId) → the saved PlayerProfile; show the toast “Banner updated” on success. */
export function useSetMyProfileBanner() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: setMyProfileBanner,
    networkMode: 'always',
    retry: false,
    onSuccess: (profile) =>
      Promise.all([
        client.invalidateQueries({ queryKey: playerAccountKeys.me(profile.playerId) }),
        client.invalidateQueries({ queryKey: playerKeys.profile(profile.playerId) }),
      ]),
  })
}
