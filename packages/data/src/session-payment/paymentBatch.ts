import type { QueryClient } from '@tanstack/react-query'
import { createDebouncedBatch } from '../batch/debouncedBatch'
import { getSessionPayments, setPaymentMarks } from './fetchers'
import { sessionPaymentKeys } from './queryKeys'

export type PaymentBatchCallbacks = {
  onSuccess?: (result: Awaited<ReturnType<typeof setPaymentMarks>>) => void
  onError?: (error: Error) => void
}
function createPaymentBatch(client: QueryClient, sessionId: string) {
  const owner = { callbacks: {} as PaymentBatchCallbacks, error: undefined as Error | undefined }
  const batch = createDebouncedBatch<string, boolean>({
    delayMs: 800,
    async send(changes) {
      const callbacks = owner.callbacks
      let result: Awaited<ReturnType<typeof setPaymentMarks>>
      try {
        result = await setPaymentMarks({
          sessionId,
          marks: changes.map(({ key, value }) => ({ clubPlayerId: key, paid: value })),
        })
      } catch (error) {
        owner.error = error instanceof Error ? error : new Error('Changes could not be saved')
        callbacks.onError?.(owner.error)
        throw error
      }
      // Refresh even after unmount: a reopened tab must never briefly show the old accepted marks.
      await client.cancelQueries({ queryKey: sessionPaymentKeys.detail(sessionId) })
      client.setQueryData(sessionPaymentKeys.detail(sessionId), await getSessionPayments(sessionId))
      await client.invalidateQueries({ predicate: (query) => query.queryKey[0] !== 'auth' })
      callbacks.onSuccess?.(result)
    },
  })
  return { batch, owner }
}
const byClient = new WeakMap<QueryClient, Map<string, ReturnType<typeof createPaymentBatch>>>()

/** Shared intent survives tab/sheet unmounts and never mutates accepted query snapshots. */
export function getPaymentBatch(client: QueryClient, sessionId: string) {
  let sessions = byClient.get(client)
  if (!sessions) {
    sessions = new Map()
    byClient.set(client, sessions)
  }
  let shared = sessions.get(sessionId)
  if (!shared) {
    shared = createPaymentBatch(client, sessionId)
    sessions.set(sessionId, shared)
  }
  return shared
}
