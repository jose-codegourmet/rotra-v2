'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { playerAccountKeys } from '../player-account/queryKeys'
import { applyPlayerSession, setHeldValue } from './applyPlayerSession'
import { confirmGoogleLink } from './fetchers'
import { googleSignInKeys } from './queryKeys'

/**
 * P-GOOGLE-LINK **Connect Google and sign in**: the player confirms once (from an `ask-to-connect`
 * outcome), Google is connected to the account whose ROTRA email it is, and they are signed in.
 * "Use my password instead" needs no call.
 */
export function useConfirmGoogleLink() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: { playerId: string; googleEmail: string }) => confirmGoogleLink(input),
    networkMode: 'always',
    onSuccess: async ({ session }) => {
      await applyPlayerSession(client, session)
      setHeldValue<string | null>(client, googleSignInKeys.triedEmail(), null)
      await client.invalidateQueries({ queryKey: playerAccountKeys.all })
    },
  })
}
