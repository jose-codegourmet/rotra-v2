import type { QueryClient } from '@tanstack/react-query'
import type { MockSession } from '../auth/auth.types'
import { authKeys } from '../auth/queryKeys'
import { googleSignInKeys } from './queryKeys'

/**
 * A Google sign-in, link, registration or claim started a Player session: drop the previous
 * account's cached reads (as `useSignIn` does), keep the `auth` root, and forget Remind me later.
 */
export async function applyPlayerSession(client: QueryClient, session: MockSession) {
  await client.cancelQueries()
  client.removeQueries({ predicate: (query) => query.queryKey[0] !== 'auth' })
  client.removeQueries({ queryKey: googleSignInKeys.remindLater() })
  client.setQueryData(authKeys.session('player'), session)
}

/** Held for this visit only, in the query cache under the `auth` root; never stored anywhere else. */
export function setHeldValue<T>(client: QueryClient, key: readonly unknown[], value: T) {
  client.setQueryDefaults(key, {
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
  })
  client.setQueryData(key, value)
}
