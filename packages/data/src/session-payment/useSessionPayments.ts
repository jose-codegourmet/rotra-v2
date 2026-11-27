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
      // #479: status compares the amount received with today's amount due. A transferred slot's
      // waiver (#1013) counts toward Paid; `paid.amount` is already net of a refund (#1014).
      const mark = paid
        ? {
            amountMinor: paid.amount,
            waivedMinor: player.transfer?.waivedMinor ?? 0,
            refundedMinor: player.refund?.amount ?? 0,
          }
        : null
      const status = paymentStatus(mark, accepted.amountDue)
      return { ...player, paid, status, mark }
    })
    .sort((a, b) => Number(!!a.paid) - Number(!!b.paid) || a.name.localeCompare(b.name))
  return {
    ...query,
    data: {
      ...query.data,
      players,
      // D-2026-11-27-01: free players (no mark) are left out of Paid X/Y, Not paid and still due.
      totals: paymentTotals({
        marks: players.flatMap((p) => (p.mark ? [p.mark] : [])),
        total: players.filter((p) => !(p.free && !p.mark)).length,
        amountDue: query.data.amountDue,
        cost: query.data.totals.cost,
        free: players.filter((p) => p.free && !p.mark).length,
      }),
    },
  }
}
