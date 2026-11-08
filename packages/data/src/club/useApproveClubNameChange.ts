'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { invalidateAdminClubQueries } from './adminCache'
import { approveClubNameChange } from './fetchers'

/** D-CLUB-NAME › Approve name change, by club ID. */
export function useApproveClubNameChange() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ clubId, requestId }: { clubId: string; requestId: string }) =>
      approveClubNameChange(clubId, requestId),
    networkMode: 'always',
    retry: false,
    onSuccess: () => invalidateAdminClubQueries(client),
  })
}
