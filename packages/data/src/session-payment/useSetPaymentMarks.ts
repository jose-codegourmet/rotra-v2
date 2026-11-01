'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useDebouncedBatch } from '../batch/useDebouncedBatch'
import type { getSessionPayments } from './fetchers'
import { getPaymentBatch, type PaymentBatchCallbacks } from './paymentBatch'
import { sessionPaymentKeys } from './queryKeys'

export function useSetPaymentMarks(sessionId: string, callbacks: PaymentBatchCallbacks = {}) {
  const client = useQueryClient()
  const shared = getPaymentBatch(client, sessionId)
  const batch = useDebouncedBatch(shared.batch)
  const accepted = () =>
    client.getQueryData<Awaited<ReturnType<typeof getSessionPayments>>>(
      sessionPaymentKeys.detail(sessionId),
    )
  function set(clubPlayerId: string, paid: boolean) {
    const player = accepted()?.players.find((p) => p.clubPlayerId === clubPlayerId)
    if (!player) return
    shared.owner.callbacks = callbacks
    shared.owner.error = undefined
    batch.set(clubPlayerId, paid, !!player.paid)
  }
  return {
    error: shared.owner.error,
    flush: batch.flush,
    set,
    markAll() {
      // Start the pending batch first, then serialize Mark all behind it. Later taps still win.
      void batch.flush()
      for (const player of accepted()?.players ?? []) set(player.clubPlayerId, true)
      void batch.flush()
    },
  }
}
