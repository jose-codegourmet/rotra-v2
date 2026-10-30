'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { invalidateAdminClubQueries } from './adminCache'
import type { AddClubInput } from './club.types'
import { addClub } from './fetchers'

/**
 * A-ADD-CLUB › Create club. Keep one sourceCommandId per review so a retry after a timeout returns
 * the club already created instead of a second one. networkMode 'always' lets an offline attempt
 * reach the fetcher and fail with the offline message rather than wait silently.
 */
export function useAddClub() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ input, sourceCommandId }: { input: AddClubInput; sourceCommandId: string }) =>
      addClub(input, sourceCommandId),
    networkMode: 'always',
    retry: false,
    onSuccess: () => invalidateAdminClubQueries(client),
  })
}
