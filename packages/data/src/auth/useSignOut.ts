'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { AuthAudience } from './auth.types'
import { signOut } from './fetchers'
import { authKeys } from './queryKeys'
export function useSignOut(audience: AuthAudience) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: () => signOut(audience),
    onSuccess: async (session) => {
      await client.cancelQueries()
      client.removeQueries({ predicate: (query) => query.queryKey[0] !== 'auth' })
      client.setQueryData(authKeys.session(audience), session)
    },
  })
}
