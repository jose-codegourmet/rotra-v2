'use client'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { setHeldValue } from './applyPlayerSession'
import { googleSignInKeys } from './queryKeys'

/**
 * Remind me later on the announcement band: held for this visit only (cleared by the next sign-in
 * and by sign-out), so the band comes back next time. Pressing it also fits the toast "We'll remind
 * you next time. Connect by <deadline>." After the deadline it is not offered
 * (`useGoogleRequirement().canRemindLater`).
 */
export function useRemindMeLater() {
  const client = useQueryClient()
  const key = googleSignInKeys.remindLater()
  const query = useQuery({
    queryKey: key,
    queryFn: () => client.getQueryData<boolean>(key) ?? false,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
    networkMode: 'always',
  })
  return {
    reminded: query.data ?? false,
    remind: () => setHeldValue(client, key, true),
  }
}
