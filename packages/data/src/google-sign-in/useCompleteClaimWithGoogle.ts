'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { leaderboardKeys } from '../leaderboard/queryKeys'
import { playerKeys } from '../player/queryKeys'
import { playerAccountKeys } from '../player-account/queryKeys'
import { applyPlayerSession } from './applyPlayerSession'
import { completeClaimWithGoogle } from './fetchers'

/**
 * The claim flow with Google instead of a password (P-CLAIM "Connect your Google account"). Same
 * link as `useClaimLink`. `data.outcome` is `claimed` (signed in) or `taken` (that Google email is
 * already on another ROTRA account: "Pick another Google account").
 */
export function useCompleteClaimWithGoogle() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: Parameters<typeof completeClaimWithGoogle>[0]) =>
      completeClaimWithGoogle(input),
    networkMode: 'always',
    onSuccess: async (result) => {
      if (result.outcome !== 'claimed') return
      await applyPlayerSession(client, result.session)
      await Promise.all([
        client.invalidateQueries({ queryKey: playerKeys.all }),
        client.invalidateQueries({ queryKey: playerAccountKeys.all }),
        client.invalidateQueries({ queryKey: leaderboardKeys.all }),
      ])
    },
  })
}
