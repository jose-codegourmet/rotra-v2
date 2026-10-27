'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
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
      client.setQueryData(authKeys.session(audience), session)
    },
  })
}
