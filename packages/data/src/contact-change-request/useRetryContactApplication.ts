'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { invalidateContactRequestQueries } from './adminCache'
import { retryContactApplication } from './fetchers'

/** Retry application, by request ID: the same approved request and provider operation, never a new one. */
export function useRetryContactApplication() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (requestId: string) => retryContactApplication(requestId),
    networkMode: 'always',
    retry: false,
    onSettled: () => invalidateContactRequestQueries(client),
  })
}
