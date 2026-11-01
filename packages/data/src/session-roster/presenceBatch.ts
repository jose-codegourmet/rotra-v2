import type { QueryClient } from '@tanstack/react-query'
import { createDebouncedBatch } from '../batch/debouncedBatch'
import { presenceScope, registerBatchFlusher } from '../batch/flushBatches'
import { setPresenceMany } from './mutations'

export type PresenceBatchCallbacks = {
  onSuccess?: (result: Awaited<ReturnType<typeof setPresenceMany>>) => void
  onError?: (error: unknown) => void
}
function createPresenceBatch(client: QueryClient, sessionId: string) {
  const owner = { callbacks: {} as PresenceBatchCallbacks }
  const batch = createDebouncedBatch<string, boolean>({
    delayMs: 800,
    async send(changes) {
      const callbacks = owner.callbacks
      try {
        const result = await setPresenceMany({
          sessionId,
          changes: changes.map(({ key, value }) => ({ rosterId: key, present: value })),
        })
        // Keep the overlay through refetches; accepted reads must be current before releasing it.
        await client.invalidateQueries({ predicate: (query) => query.queryKey[0] !== 'auth' })
        callbacks.onSuccess?.(result)
      } catch (error) {
        callbacks.onError?.(error)
        throw error
      }
    },
  })
  let unregister: (() => void) | undefined
  batch.subscribe(() => {
    if (batch.pendingKeys().size)
      unregister ??= registerBatchFlusher(presenceScope(sessionId), batch.flush)
    else {
      unregister?.()
      unregister = undefined
    }
  })
  return { batch, owner }
}
const byClient = new WeakMap<QueryClient, Map<string, ReturnType<typeof createPresenceBatch>>>()
/** Each QueryClient/session shares one overlay, including between route/tab containers. */
export function getPresenceBatch(client: QueryClient, sessionId: string) {
  let sessions = byClient.get(client)
  if (!sessions) {
    sessions = new Map()
    byClient.set(client, sessions)
  }
  let shared = sessions.get(sessionId)
  if (!shared) {
    shared = createPresenceBatch(client, sessionId)
    sessions.set(sessionId, shared)
  }
  return shared
}
