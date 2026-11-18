'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { googleSignInKeys } from '../google-sign-in/queryKeys'
import { clearAccountQueries } from './accountScope'
import type { AuthAudience } from './auth.types'
import { signOut } from './fetchers'
import { authKeys } from './queryKeys'
export function useSignOut(audience: AuthAudience) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: () => signOut(audience),
    onSuccess: async (session) => {
      await clearAccountQueries(client)
      // Visit-only Google state (tried email, Remind me later) ends with the session.
      client.removeQueries({ queryKey: googleSignInKeys.triedEmail() })
      client.removeQueries({ queryKey: googleSignInKeys.remindLater() })
      client.setQueryData(authKeys.session(audience), session)
    },
  })
}
