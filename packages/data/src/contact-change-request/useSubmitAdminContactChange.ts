'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { invalidateContactRequestQueries } from './adminCache'
import { submitAdminContactChange } from './fetchers'

/** A-PLAYERS › Edit profile: send an Admin-entered email for review (pending; nothing changes yet). */
export function useSubmitAdminContactChange() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: submitAdminContactChange,
    networkMode: 'always',
    retry: false,
    onSettled: () => invalidateContactRequestQueries(client),
  })
}
