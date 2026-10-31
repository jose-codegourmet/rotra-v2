'use client'
import { type QueryClient, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'

/** Query roots that survive an account change: the session itself and device-local sync evidence. */
const KEPT_ROOTS = new Set(['auth', 'sync'])

/**
 * Drops the previous account's cached reads so they never show under a new account. Mutations,
 * including paused offline ones, stay in the mutation cache, and sync queries are kept, so unsynced
 * Queue evidence is never silently discarded.
 */
export async function clearAccountQueries(client: QueryClient) {
  await client.cancelQueries()
  client.removeQueries({ predicate: (query) => !KEPT_ROOTS.has(String(query.queryKey[0])) })
}

/** Clears account-scoped queries whenever the signed-in account ID changes (including sign-out). */
export function useAccountScope(accountId: string | null) {
  const client = useQueryClient()
  const previous = useRef(accountId)
  useEffect(() => {
    if (previous.current !== null && previous.current !== accountId)
      void clearAccountQueries(client)
    previous.current = accountId
  }, [accountId, client])
}
