'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { playerKeys } from '../player/queryKeys'
import { playerAccountKeys } from '../player-account/queryKeys'
import { playerClubKeys } from '../player-club/queryKeys'
import { applyPlayerSession } from './applyPlayerSession'
import { registerWithGoogle } from './fetchers'
import type { GoogleRegistrationInput } from './googleSignIn.types'

/**
 * Create a ROTRA account from a Google account on an invite (P-INVITE form). The Google email is the
 * ROTRA email, confirmed at once; no password; phone required (and `cityCode` for the Admin link).
 * `data.outcome` is `registered` (signed in, and joined the invite's club) or `account-match`.
 */
export function useGoogleRegistration() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: GoogleRegistrationInput) => registerWithGoogle(input),
    networkMode: 'always',
    onSuccess: async (result) => {
      if (result.outcome !== 'registered') return
      await applyPlayerSession(client, result.session)
      await Promise.all([
        client.invalidateQueries({ queryKey: playerKeys.all }),
        client.invalidateQueries({ queryKey: playerClubKeys.all }),
        client.invalidateQueries({ queryKey: playerAccountKeys.all }),
      ])
    },
  })
}
