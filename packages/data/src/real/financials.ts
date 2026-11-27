import { formatPeso } from '@rotra/schema/money'
import type {
  SessionCostEstimate,
  SessionCostInput,
  SessionCostResult,
  SessionShuttlePlanLine,
} from '../session-cost/sessionCost.types'
import { type PaymentTotals, paymentStatus } from '../session-payment/sessionPayment.rules'
import type {
  RecordSessionRefundInput,
  SetPaymentAmountInput,
  SetPaymentMarksInput,
  SetPlayerFreeInput,
} from '../session-payment/sessionPayment.types'
import type { SlotPaymentTransfer } from '../slot-transfer/slotTransfer.types'
import { minorOf, msOf, realRequest, type WireMoney } from './client'
import { accepted } from './queue'

// Session cost estimate and payments (Q-MONEY), over `@rotra/db/queue/financials`. Online only in
// real mode: offline ticks need the sync change log (#399), so offline nothing is sent.

const sessionPath = (sessionId: string, rest: string) =>
  `/api/sessions/${encodeURIComponent(sessionId)}/${rest}`

// ---------- Cost estimate (Q-SETUP, Q-PREPARE, Q-RECORD) ----------

type WireSessionCost = {
  input: SessionCostInput | null
  estimate: SessionCostResult | null
  revision: string | null
  courts: number
  durationMinutes: number
  shuttleLines: (SessionShuttlePlanLine & { name: string })[]
}

/** The same shape as the mock's `sessionCostIn`: null when no estimate is saved. */
export async function realGetSessionCostEstimate(sessionId: string) {
  const { cost } = await realRequest<{ cost: WireSessionCost }>(sessionPath(sessionId, 'cost'))
  if (!cost.input || !cost.estimate) return null
  const saved: SessionCostEstimate = { ...cost.input, sessionId, currency: 'PHP' }
  return {
    saved,
    estimate: cost.estimate,
    courts: cost.courts,
    durationMinutes: cost.durationMinutes,
    shuttleLines: cost.shuttleLines.map((line, index) => ({
      inventoryItemId: line.inventoryItemId,
      tubes: line.tubes,
      id: `${sessionId}-${index}`,
      name: line.name,
    })),
  }
}

// ---------- Payments checklist (Q-MONEY) ----------

export type WirePayments = {
  players: {
    sessionPlayerId: string
    clubPlayerId: string
    name: string
    /** Plays free (D-2026-11-27-01); missing on older servers means false */
    free?: boolean
    /** Own cash plus cash an approved slot transfer carried in (#1013); `at` the latest of them */
    paid: { amount: WireMoney; at: string } | null
    /** The slot came by approved transfer (#1013): waivers and the chain; missing or null otherwise */
    transfer?: WireSlotPaymentTransfer | null
    /**
     * The manual full refund recorded for this player (#1014); `paid.amount` is already net of it.
     * Missing on a server from before #1014.
     */
    refund?: { amount: WireMoney; at: string } | null
  }[]
  amountDue: number | null
  dueBasis: SessionCostInput['paymentMode']
  entranceFeeIncluded: number | null
  totals: PaymentTotals
}

export type WireSlotPaymentTransfer = Omit<SlotPaymentTransfer, 'steps'> & {
  steps: (Omit<SlotPaymentTransfer['steps'][number], 'approvedAt'> & { approvedAt: string })[]
}

export const slotPaymentTransferOf = (
  wire: WireSlotPaymentTransfer | null | undefined,
): SlotPaymentTransfer | undefined =>
  wire
    ? {
        waivedMinor: wire.waivedMinor,
        steps: wire.steps.map((step) => ({ ...step, approvedAt: msOf(step.approvedAt) })),
      }
    : undefined

export async function realGetSessionPayments(sessionId: string) {
  const { payments } = await realRequest<{ payments: WirePayments | null }>(
    sessionPath(sessionId, 'payments'),
  )
  if (!payments) return null
  return {
    players: payments.players.map((player) => {
      // A legacy mark with no amount counts as paid in full at today's amount due (#479).
      const mark = player.paid
        ? {
            amountMinor: minorOf(player.paid.amount),
            waivedMinor: player.transfer?.waivedMinor ?? 0,
            refundedMinor: player.refund ? (minorOf(player.refund.amount) ?? 0) : 0,
          }
        : null
      return {
        sessionPlayerId: player.sessionPlayerId,
        clubPlayerId: player.clubPlayerId,
        name: player.name,
        free: !!player.free,
        // Saved data has no player pictures on this read yet.
        picture: undefined as string | undefined,
        paid: player.paid
          ? {
              amount: mark?.amountMinor ?? payments.amountDue ?? 0,
              at: msOf(player.paid.at),
            }
          : undefined,
        status: paymentStatus(mark, payments.amountDue),
        transfer: slotPaymentTransferOf(player.transfer),
        refund: player.refund
          ? { amount: minorOf(player.refund.amount) ?? 0, at: msOf(player.refund.at) }
          : undefined,
      }
    }),
    amountDue: payments.amountDue,
    dueBasis: payments.dueBasis,
    entranceFeeIncluded: payments.entranceFeeIncluded ?? undefined,
    totals: payments.totals,
  }
}

type WireMarks = {
  count: number
  marks: { clubPlayerId: string; paid: boolean; amount: WireMoney }[]
}

const postMarks = (
  sessionId: string,
  marks: SetPaymentMarksInput['marks'],
  operationId: string = crypto.randomUUID(),
) =>
  realRequest<WireMarks>(sessionPath(sessionId, 'payments'), {
    method: 'POST',
    body: { operationId, marks },
  })

/** One batch of desired end states (#300), saved together or not at all. */
export async function realSetPaymentMarks({
  sessionId,
  marks,
  operationId,
}: SetPaymentMarksInput & { operationId?: string }) {
  const { count } = await postMarks(sessionId, marks, operationId)
  return accepted({ count }, `${count} payment mark${count === 1 ? '' : 's'} saved`)
}

/** Flips the saved tick: reads the current state, then saves its opposite. */
export async function realTogglePaid(input: {
  sessionId: string
  clubPlayerId: string
  operationId?: string
}) {
  const current = await realGetSessionPayments(input.sessionId)
  const player = current?.players.find((p) => p.clubPlayerId === input.clubPlayerId)
  const result = await postMarks(
    input.sessionId,
    [{ clubPlayerId: input.clubPlayerId, paid: !player?.paid }],
    input.operationId,
  )
  const mark = result.marks[0]
  const name = player?.name ?? 'Player'
  return mark?.paid
    ? accepted({ paid: true }, `${name} paid ${formatPeso(minorOf(mark.amount) ?? 0)}`)
    : accepted({ paid: false }, `${name} marked not paid`)
}

/** #479 · one player's amount received; 0 removes the mark (not paid). */
export async function realSetPaymentAmount({
  sessionId,
  clubPlayerId,
  amountMinor,
  operationId = crypto.randomUUID() as string,
}: SetPaymentAmountInput & { operationId?: string }) {
  const current = await realGetSessionPayments(sessionId)
  const name = current?.players.find((p) => p.clubPlayerId === clubPlayerId)?.name ?? 'Player'
  const { paid } = await realRequest<{ paid: boolean; amount: WireMoney }>(
    sessionPath(sessionId, 'payments/amount'),
    { method: 'POST', body: { operationId, clubPlayerId, amountMinor } },
  )
  return paid
    ? accepted({ paid: true }, `${name} paid ${formatPeso(amountMinor)}`)
    : accepted({ paid: false }, `${name} marked not paid`)
}

/** D-2026-11-27-01 · Plays free on one player; setting it clears their amount received. */
export async function realSetPlayerFree({
  sessionId,
  clubPlayerId,
  free,
  operationId = crypto.randomUUID() as string,
}: SetPlayerFreeInput & { operationId?: string }) {
  const current = await realGetSessionPayments(sessionId)
  const name = current?.players.find((p) => p.clubPlayerId === clubPlayerId)?.name ?? 'Player'
  await realRequest<{ free: boolean; cleared: boolean }>(sessionPath(sessionId, 'payments/free'), {
    method: 'POST',
    body: { operationId, clubPlayerId, free },
  })
  return accepted({ free }, free ? `${name} plays free` : `${name} pays again`)
}

export async function realMarkAllPaid(
  sessionId: string,
  operationId: string = crypto.randomUUID(),
) {
  const { count } = await realRequest<{ count: number }>(
    sessionPath(sessionId, 'payments/mark-all'),
    { method: 'POST', body: { operationId } },
  )
  return accepted({ count }, `${count} players marked paid`)
}

/**
 * #1014 · **Record refund** on a cancelled session's Refund everyone who paid list: one manual full
 * refund per player, append-only. Sends the amount shown; 409 when it no longer matches. A retry
 * after a lost reply returns the refund already recorded.
 */
export async function realRecordSessionRefund(input: RecordSessionRefundInput) {
  const done = await realRequest<{ message: string }>(
    sessionPath(input.sessionId, 'payments/refunds'),
    {
      method: 'POST',
      body: {
        sessionPlayerId: input.sessionPlayerId,
        expectedAmountMinor: input.expectedAmountMinor,
      },
    },
  )
  return accepted(null, done.message)
}
