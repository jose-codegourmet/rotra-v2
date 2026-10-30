'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { invalidateContactRequestQueries } from './adminCache'
import { checkContactApplication } from './fetchers'

/** Check status on a change being applied, by request ID; resolves with the request as it now stands. */
export function useCheckContactApplication() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (requestId: string) => checkContactApplication(requestId),
    networkMode: 'always',
    retry: false,
    onSuccess: () => invalidateContactRequestQueries(client),
  })
}
