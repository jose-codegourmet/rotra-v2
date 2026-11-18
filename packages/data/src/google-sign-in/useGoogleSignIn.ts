'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { applyPlayerSession, setHeldValue } from './applyPlayerSession'
import { signInWithGoogle } from './fetchers'
import type { GoogleIdentity, GoogleSignInContext } from './googleSignIn.types'
import { googleSignInKeys } from './queryKeys'

/**
 * Continue with Google, after the player picks an account (P-LOGIN with `login`, P-INVITE with
 * `register`). Read `data.outcome`: `signed-in` (a session now exists), `ask-to-connect` (open
 * P-GOOGLE-LINK), `not-connected` (login only; the tried email is held by `useGoogleTriedEmail`),
 * `new-account` (register only; open the Google registration form).
 */
export function useGoogleSignIn() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: { google: GoogleIdentity; context: GoogleSignInContext }) =>
      signInWithGoogle(input),
    networkMode: 'always',
    onSuccess: async (result) => {
      if (result.outcome === 'signed-in') {
        await applyPlayerSession(client, result.session)
        setHeldValue<string | null>(client, googleSignInKeys.triedEmail(), null)
      } else if (result.outcome === 'not-connected') {
        setHeldValue(client, googleSignInKeys.triedEmail(), result.triedEmail)
      }
    },
  })
}
