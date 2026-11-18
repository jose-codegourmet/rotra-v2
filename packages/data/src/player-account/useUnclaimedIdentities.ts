'use client'
import { useQuery } from '@tanstack/react-query'
import { playerAccountKeys } from './queryKeys'
import { getUnclaimedIdentities } from './unclaimedIdentity'

/**
 * The identity cards for the Google account the person just picked on an invite
 * (D-2026-11-16-04): `data` is null when no club saved that email; `data.records` has one card per
 * club that did (more than one opens IdentityPicker). `useGoogleSignIn`'s `new-account` outcome
 * already carries the same value as `unclaimed`; this hook is for a screen that needs it again.
 * Pass null until a Google account was picked. Never call it for an email typed into a form.
 */
export function useUnclaimedIdentities(googleEmail: string | null) {
  return useQuery({
    queryKey: playerAccountKeys.unclaimedIdentities(googleEmail ?? ''),
    queryFn: ({ signal }) => getUnclaimedIdentities(googleEmail ?? '', signal),
    enabled: !!googleEmail,
  })
}
