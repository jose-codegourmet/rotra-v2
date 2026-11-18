'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { googleSignInKeys } from '../google-sign-in/queryKeys'
import type { AuthAudience, SignInInput } from './auth.types'
import { signIn } from './fetchers'
import { authKeys } from './queryKeys'
export function useSignIn(audience: AuthAudience) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: SignInInput) => signIn(audience, input),
    onSuccess: async (session) => {
      await client.cancelQueries()
      client.removeQueries({ predicate: (query) => query.queryKey[0] !== 'auth' })
      // A new sign-in starts the visit's Google announcement over; the tried Google email stays.
      client.removeQueries({ queryKey: googleSignInKeys.remindLater() })
      client.setQueryData(authKeys.session(audience), session)
    },
  })
}
