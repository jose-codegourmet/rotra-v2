'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { playerAccountKeys } from '../player-account/queryKeys'
import { advanceContactChangeRequest } from './fetchers'
import { contactChangeRequestKeys } from './queryKeys'
/** DevMenu only: the Admin-side Approve, Decline, Finish applying, Applying fails, Retry succeeds. */
export function useAdvanceContactChangeRequest() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: advanceContactChangeRequest,
    networkMode: 'always',
    onSuccess: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: contactChangeRequestKeys.all }),
        client.invalidateQueries({ queryKey: playerAccountKeys.all }),
      ]),
  })
}
