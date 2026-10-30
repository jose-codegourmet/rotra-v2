'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { invalidateAdminClubQueries } from './adminCache'
import { rejectClubNameChange } from './fetchers'

/** D-CLUB-NAME › Reject request, by club ID; the club keeps its current name. */
export function useRejectClubNameChange() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (clubId: string) => rejectClubNameChange(clubId),
    networkMode: 'always',
    retry: false,
    onSuccess: () => invalidateAdminClubQueries(client),
  })
}
