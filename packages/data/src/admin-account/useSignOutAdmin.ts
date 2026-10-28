'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { replaceAdminSession } from './cache'
import { signOutAdmin } from './fetchers'

export function useSignOutAdmin() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: { sessionEnded?: boolean } | void) => signOutAdmin(input || undefined),
    onSuccess: (session) => replaceAdminSession(client, session),
    networkMode: 'always',
    retry: false,
  })
}
