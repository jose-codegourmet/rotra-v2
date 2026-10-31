'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
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
      client.setQueryData(authKeys.session(audience), session)
    },
  })
}
