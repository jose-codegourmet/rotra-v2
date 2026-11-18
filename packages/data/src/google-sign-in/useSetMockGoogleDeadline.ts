'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { setMockGoogleDeadline } from './fetchers'
import { googleSignInKeys } from './queryKeys'

/** Development switch (dev menu): `mutate(true)` counts the deadline as passed, `mutate(false)` as not yet. */
export function useSetMockGoogleDeadline() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (passed: boolean) => setMockGoogleDeadline(passed),
    networkMode: 'always',
    onSuccess: (deadline) => {
      client.setQueryData(googleSignInKeys.deadline(), deadline)
    },
  })
}
