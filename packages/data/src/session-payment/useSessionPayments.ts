'use client'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSyncExternalStore } from 'react'
import { getSessionPayments } from './fetchers'
import { getPaymentBatch } from './paymentBatch'
import { sessionPaymentKeys } from './queryKeys'
import { paymentStatus, paymentTotals } from './sessionPayment.rules'
export function useSessionPayments(sessionId: string) {
  const client = useQueryClient()
  const { batch } = getPaymentBatch(client, sessionId)
  useSyncExternalStore(batch.subscribe, batch.getSnapshot, () => 0)
  const query = useQuery({
    queryKey: sessionPaymentKeys.detail(sessionId),
    enabled: !!sessionId,
    queryFn: () => getSessionPayments(sessionId),
  })
  if (!query.data) return query
  const accepted = query.data
  const players = accepted.players
    .map((player) => {
      const paid = batch.value(player.clubPlayerId, !!player.paid)
        ? (player.paid ?? {
            amount: accepted.amountDue ?? 0,
            at: batch.changedAt(player.clubPlayerId) ?? 0,
          })
        : undefined
      // #479: status compares the amount received with today's amount due.
      const status = paymentStatus(paid ? { amountMinor: paid.amount } : null, accepted.amountDue)
      return { ...player, paid, status }
    })
    .sort((a, b) => Number(!!a.paid) - Number(!!b.paid) || a.name.localeCompare(b.name))
  return {
    ...query,
    data: {
      ...query.data,
      players,
      totals: paymentTotals({
        marks: players.flatMap((p) => (p.paid ? [{ amountMinor: p.paid.amount }] : [])),
        total: players.length,
        amountDue: query.data.amountDue,
        cost: query.data.totals.cost,
      }),
    },
  }
}
