'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { setMockInviteStanding } from './fetchers'
import { googleSignInKeys } from './queryKeys'

/**
 * Development stand-in (dev menu): puts the signed-in player on a session's roster (`in`), waitlist
 * (`waitlist`) or neither (`none`), so the "already in" and "on the waitlist" invite landings can
 * be reached. Mock mode only.
 */
export function useSetMockInviteStanding() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: setMockInviteStanding,
    networkMode: 'always',
    onSuccess: () => client.invalidateQueries({ queryKey: googleSignInKeys.all }),
  })
}
