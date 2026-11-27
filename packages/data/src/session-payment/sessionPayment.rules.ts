/**
 * Q-MONEY payment status and totals (owner decision, November 7, 2026, #479). Pure; integer
 * centavos. A payment mark stores the amount **received** (`amountMinor`); status always compares it
 * with the **current** amount due, so changing the session's pricing never rewrites what was
 * received. Reimburse only tracks an obligation: ROTRA moves no money.
 */

export type PaymentStatus =
  | { kind: 'unpaid' }
  | { kind: 'paid' }
  | { kind: 'partial'; left: number }
  | { kind: 'reimburse'; toReturn: number }

/**
 * Free players (D-2026-11-27-01): a slot paid through a slot transfer (#1013) or refunded (#1014)
 * keeps its payment history, so it can't be set free.
 */
export const FREE_PAYMENT_LOCKED_ERROR =
  'This slot was paid on a transfer, so it can’t be set free.'

/**
 * The amount a mark counts as received. A legacy mark with no amount (null) meant "paid in full",
 * so it counts as the current amount due (0 with no fee set). No mark: nothing received.
 */
export function receivedAmount(
  mark: { amountMinor: number | null } | null | undefined,
  amountDue: number | null,
): number {
  if (!mark) return 0
  return mark.amountMinor ?? amountDue ?? 0
}

/**
 * No mark → Unpaid. No fee set → any mark is Paid. Otherwise cash received plus any waived amount
 * (slot transfers, #1013) vs current due: equal → Paid, nothing at all → Unpaid, below → Partial
 * (₱X left), above → Reimburse (₱X to return) for the **cash** above the amount due only. A waiver
 * is never cash: a slot covered past the amount due by a waiver is simply Paid.
 */
export function paymentStatus(
  mark: { amountMinor: number | null; waivedMinor?: number } | null | undefined,
  amountDue: number | null,
): PaymentStatus {
  if (!mark) return { kind: 'unpaid' }
  if (amountDue === null) return { kind: 'paid' }
  const received = receivedAmount(mark, amountDue)
  const covered = received + Math.max(mark.waivedMinor ?? 0, 0)
  if (covered === amountDue) return { kind: 'paid' }
  if (covered <= 0) return { kind: 'unpaid' }
  if (covered < amountDue) return { kind: 'partial', left: amountDue - covered }
  const toReturn = received - amountDue
  return toReturn > 0 ? { kind: 'reimburse', toReturn } : { kind: 'paid' }
}

/**
 * The status an amount typed in the payment editor would save: 0 removes the mark, so it previews
 * as Unpaid even with no fee set.
 */
export function statusForReceived(received: number, amountDue: number | null): PaymentStatus {
  return paymentStatus(received > 0 ? { amountMinor: received } : null, amountDue)
}

/** Paid and Reimburse players are fully covered. */
export function isFullyPaid(status: PaymentStatus) {
  return status.kind === 'paid' || status.kind === 'reimburse'
}

/**
 * Payments checklist totals over one roster: `marks` holds one entry per marked roster player and
 * `total` the roster size (unmarked players received nothing). A slot transfer (#1013) passes the
 * holder's cash (own + carried) as `amountMinor` and the slot's waivers as `waivedMinor`.
 * - paid = Paid + Reimburse; partial = Partial
 * - collected = Σ received cash the club keeps; **never** a waived amount. A manual refund (#1014,
 *   D-2026-11-22-06) is already out of `amountMinor` (net kept = received − refunded)
 * - refunded = Σ refunded (`refundedMinor`, a record of cash handed back outside ROTRA)
 * - waived = Σ waived (a record, not cash)
 * - still due = Σ max(due − received − waived, 0) over the roster (null with no fee set)
 * - to reimburse = Σ max(received − due, 0) (0 with no fee set)
 * - against costs = collected (net kept) − total cost (null without an estimate)
 * - free (D-2026-11-27-01): free players the caller left out of `marks` and `total`; a count only
 */
export function paymentTotals({
  marks,
  total,
  amountDue,
  cost,
  free = 0,
}: {
  marks: { amountMinor: number | null; waivedMinor?: number; refundedMinor?: number }[]
  total: number
  amountDue: number | null
  cost: number | null
  free?: number
}) {
  let paid = 0,
    partial = 0,
    collected = 0,
    owed = 0,
    waived = 0,
    refunded = 0,
    toReimburse = 0
  for (const mark of marks) {
    const status = paymentStatus(mark, amountDue)
    const received = receivedAmount(mark, amountDue)
    const markWaived = Math.max(mark.waivedMinor ?? 0, 0)
    collected += received
    waived += markWaived
    refunded += Math.max(mark.refundedMinor ?? 0, 0)
    if (isFullyPaid(status)) paid++
    if (status.kind === 'partial') partial++
    if (amountDue !== null) {
      owed += Math.max(amountDue - received - markWaived, 0)
      toReimburse += Math.max(received - amountDue, 0)
    }
  }
  return {
    paid,
    partial,
    total,
    collected,
    waived,
    refunded,
    stillDue: amountDue === null ? null : (total - marks.length) * amountDue + owed,
    toReimburse,
    againstCosts: cost === null ? null : collected - cost,
    cost,
    // Only while someone is free, so totals with no free players keep their old shape.
    ...(free ? { free } : {}),
  } as {
    paid: number
    partial: number
    total: number
    collected: number
    waived: number
    refunded: number
    stillDue: number | null
    toReimburse: number
    againstCosts: number | null
    cost: number | null
    free?: number
  }
}
export type PaymentTotals = ReturnType<typeof paymentTotals>
