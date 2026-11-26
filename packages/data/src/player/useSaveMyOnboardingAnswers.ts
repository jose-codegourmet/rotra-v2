'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { playerAccountKeys } from '../player-account/queryKeys'
import { playerNotificationKeys } from '../player-notifications/queryKeys'
import { saveMyOnboardingAnswers } from './fetchers'
import { playerKeys } from './queryKeys'

/** mutate(OnboardingAnswers) → the saved PlayerProfile. Rejects with a MockError('conflict') on an invalid answer (more than 6 own shots, over 24 characters, a repeat of the list). */
export function useSaveMyOnboardingAnswers() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: saveMyOnboardingAnswers,
    networkMode: 'always',
    retry: false,
    onSuccess: (profile) =>
      Promise.all([
        client.invalidateQueries({ queryKey: playerKeys.profile(profile.playerId) }),
        client.invalidateQueries({ queryKey: playerAccountKeys.me(profile.playerId) }),
      ]),
  })
}
