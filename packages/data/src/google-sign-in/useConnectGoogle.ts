'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { playerAccountKeys } from '../player-account/queryKeys'
import { setHeldValue } from './applyPlayerSession'
import { connectGoogle } from './fetchers'
import type { GoogleIdentity } from './googleSignIn.types'
import { googleSignInKeys } from './queryKeys'

/**
 * Connect or Change Google while signed in (Sign-in methods, the announcement band, P-GOOGLE-REQUIRED,
 * **Connect <tried email>**). Any Google account the player owns works, even with a different
 * email; the ROTRA email never changes. `data.outcome` is `connected` or `taken` (another ROTRA
 * account already uses that Google email: refuse, nothing changes). There is no disconnect.
 */
export function useConnectGoogle() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (google: GoogleIdentity) => connectGoogle(google),
    networkMode: 'always',
    onSuccess: async (result) => {
      if (result.outcome !== 'connected') return
      setHeldValue<string | null>(client, googleSignInKeys.triedEmail(), null)
      await client.invalidateQueries({ queryKey: playerAccountKeys.all })
    },
  })
}
