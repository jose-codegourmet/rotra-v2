'use client'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSyncExternalStore } from 'react'
import { paymentTotals } from '../session-cost/sessionCost.rules'
import { getSessionPayments } from './fetchers'
import { getPaymentBatch } from './paymentBatch'
import { sessionPaymentKeys } from './queryKeys'
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
    .map((player) => ({
      ...player,
      paid: batch.value(player.clubPlayerId, !!player.paid)
        ? (player.paid ?? {
            amount: accepted.amountDue ?? 0,
            at: batch.changedAt(player.clubPlayerId) ?? 0,
          })
        : undefined,
    }))
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
