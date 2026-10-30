'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { invalidateContactRequestQueries } from './adminCache'
import { declineContactChange } from './fetchers'

/** Decline request, by request ID. */
export function useDeclineContactChange() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (requestId: string) => declineContactChange(requestId),
    networkMode: 'always',
    retry: false,
    onSettled: () => invalidateContactRequestQueries(client),
  })
}
