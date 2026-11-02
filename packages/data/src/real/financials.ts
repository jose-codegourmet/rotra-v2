import { formatPeso } from '@rotra/schema/money'
import type { paymentTotals } from '../session-cost/sessionCost.rules'
import type {
  SessionCostEstimate,
  SessionCostInput,
  SessionCostResult,
  SessionShuttlePlanLine,
} from '../session-cost/sessionCost.types'
import type { SetPaymentMarksInput } from '../session-payment/sessionPayment.types'
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

type WirePayments = {
  players: {
    sessionPlayerId: string
    clubPlayerId: string
    name: string
    paid: { amount: WireMoney; at: string } | null
  }[]
  amountDue: number | null
  dueBasis: SessionCostInput['paymentMode']
  entranceFeeIncluded: number | null
  totals: ReturnType<typeof paymentTotals>
}

export async function realGetSessionPayments(sessionId: string) {
  const { payments } = await realRequest<{ payments: WirePayments | null }>(
    sessionPath(sessionId, 'payments'),
  )
  if (!payments) return null
  return {
    players: payments.players.map((player) => ({
      sessionPlayerId: player.sessionPlayerId,
      clubPlayerId: player.clubPlayerId,
      name: player.name,
      // Saved data has no player pictures on this read yet.
      picture: undefined as string | undefined,
      paid: player.paid
        ? // The server refuses no-fee ticks (#245), so a recorded amount is always set.
          { amount: minorOf(player.paid.amount) ?? 0, at: msOf(player.paid.at) }
        : undefined,
    })),
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

const postMarks = (sessionId: string, marks: SetPaymentMarksInput['marks']) =>
  realRequest<WireMarks>(sessionPath(sessionId, 'payments'), {
    method: 'POST',
    body: { operationId: crypto.randomUUID(), marks },
  })

/** One batch of desired end states (#300), saved together or not at all. */
export async function realSetPaymentMarks({ sessionId, marks }: SetPaymentMarksInput) {
  const { count } = await postMarks(sessionId, marks)
  return accepted({ count }, `${count} payment mark${count === 1 ? '' : 's'} saved`)
}

/** Flips the saved tick: reads the current state, then saves its opposite. */
export async function realTogglePaid(input: { sessionId: string; clubPlayerId: string }) {
  const current = await realGetSessionPayments(input.sessionId)
  const player = current?.players.find((p) => p.clubPlayerId === input.clubPlayerId)
  const result = await postMarks(input.sessionId, [
    { clubPlayerId: input.clubPlayerId, paid: !player?.paid },
  ])
  const mark = result.marks[0]
  const name = player?.name ?? 'Player'
  return mark?.paid
    ? accepted({ paid: true }, `${name} paid ${formatPeso(minorOf(mark.amount) ?? 0)}`)
    : accepted({ paid: false }, `${name} marked not paid`)
}

export async function realMarkAllPaid(sessionId: string) {
  const { count } = await realRequest<{ count: number }>(
    sessionPath(sessionId, 'payments/mark-all'),
    { method: 'POST', body: { operationId: crypto.randomUUID() } },
  )
  return accepted({ count }, `${count} players marked paid`)
}
