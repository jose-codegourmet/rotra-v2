'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { playerAccountKeys } from '../player-account/queryKeys'
import { playerNotificationKeys } from '../player-notifications/queryKeys'
import { setMyGender } from './fetchers'
import { playerKeys } from './queryKeys'

/** mutate('male' | 'female' | null) → the saved PlayerProfile. Setting a gender also drops the Add your gender notification. */
export function useSetMyGender() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: setMyGender,
    networkMode: 'always',
    retry: false,
    onSuccess: (profile) =>
      Promise.all([
        client.invalidateQueries({ queryKey: playerKeys.profile(profile.playerId) }),
        client.invalidateQueries({ queryKey: playerAccountKeys.me(profile.playerId) }),
        client.invalidateQueries({ queryKey: playerNotificationKeys.owner(profile.playerId) }),
      ]),
  })
}
