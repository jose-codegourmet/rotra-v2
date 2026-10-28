'use client'
import { type MutateOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRef } from 'react'
import type { AdminSession, AdminSignInInput } from './adminAccount.types'
import { replaceAdminSession } from './cache'
import { signInAdmin } from './fetchers'

type Options = MutateOptions<AdminSession, Error, void, unknown>
export function useSignInAdmin() {
  const client = useQueryClient()
  // Keep credentials transient, outside TanStack's retained mutation variables/cache.
  const credentials = useRef<AdminSignInInput | null>(null)
  const submitting = useRef(false)
  const mutation = useMutation<AdminSession, Error, void>({
    mutationFn: () => {
      const input = credentials.current
      credentials.current = null
      if (!input) throw new Error('Enter your sign-in details.')
      return signInAdmin(input)
    },
    onSuccess: (session) => replaceAdminSession(client, session),
    onSettled: () => {
      submitting.current = false
    },
    retry: false,
    networkMode: 'always',
  })
  return {
    ...mutation,
    mutate: (input: AdminSignInInput, options?: Options) => {
      if (submitting.current) return
      submitting.current = true
      credentials.current = { ...input }
      mutation.mutate(undefined, options)
    },
    mutateAsync: async (input: AdminSignInInput, options?: Options) => {
      if (submitting.current) return
      submitting.current = true
      credentials.current = { ...input }
      return mutation.mutateAsync(undefined, options)
    },
  }
}
