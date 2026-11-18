'use client'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { setHeldValue } from './applyPlayerSession'
import { normalizeGoogleEmail } from './googleSignIn.rules'
import { googleSignInKeys } from './queryKeys'

/**
 * The Google email tried on P-LOGIN that isn't connected to ROTRA, held for this visit so the
 * player can press **Connect <email>** right after the password sign-in (the announcement band and
 * P-GOOGLE-REQUIRED). `useGoogleSignIn` sets it on a `not-connected` outcome; `useConnectGoogle`
 * and sign-out clear it.
 */
export function useGoogleTriedEmail() {
  const client = useQueryClient()
  const key = googleSignInKeys.triedEmail()
  const query = useQuery({
    queryKey: key,
    queryFn: () => client.getQueryData<string | null>(key) ?? null,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
    networkMode: 'always',
  })
  return {
    email: query.data ?? null,
    set: (email: string) => setHeldValue(client, key, normalizeGoogleEmail(email)),
    clear: () => setHeldValue<string | null>(client, key, null),
  }
}
