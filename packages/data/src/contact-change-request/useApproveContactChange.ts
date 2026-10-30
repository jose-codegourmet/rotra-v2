'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { invalidateContactRequestQueries } from './adminCache'
import { approveContactChange } from './fetchers'

/** D-CONTACT › Approve change, by request ID. Resolves once approved (status applying); the detail polls until the change is applied or fails. */
export function useApproveContactChange() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (requestId: string) => approveContactChange(requestId),
    networkMode: 'always',
    retry: false,
    onSettled: () => invalidateContactRequestQueries(client),
  })
}
