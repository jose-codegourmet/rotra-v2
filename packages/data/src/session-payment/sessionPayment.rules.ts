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
 * No mark → Unpaid. No fee set → any mark is Paid. Otherwise received vs current due: equal → Paid,
 * nothing received → Unpaid, below → Partial (₱X left), above → Reimburse (₱X to return).
 */
export function paymentStatus(
  mark: { amountMinor: number | null } | null | undefined,
  amountDue: number | null,
): PaymentStatus {
  if (!mark) return { kind: 'unpaid' }
  if (amountDue === null) return { kind: 'paid' }
  const received = receivedAmount(mark, amountDue)
  if (received === amountDue) return { kind: 'paid' }
  if (received <= 0) return { kind: 'unpaid' }
  if (received < amountDue) return { kind: 'partial', left: amountDue - received }
  return { kind: 'reimburse', toReturn: received - amountDue }
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
 * `total` the roster size (unmarked players received nothing).
 * - paid = Paid + Reimburse; partial = Partial
 * - collected = Σ received
 * - still due = Σ max(due − received, 0) over the roster (null with no fee set)
 * - to reimburse = Σ max(received − due, 0) (0 with no fee set)
 * - against costs = collected − total cost (null without an estimate)
 */
export function paymentTotals({
  marks,
  total,
  amountDue,
  cost,
}: {
  marks: { amountMinor: number | null }[]
  total: number
  amountDue: number | null
  cost: number | null
}) {
  let paid = 0,
    partial = 0,
    collected = 0,
    owed = 0,
    toReimburse = 0
  for (const mark of marks) {
    const status = paymentStatus(mark, amountDue)
    const received = receivedAmount(mark, amountDue)
    collected += received
    if (isFullyPaid(status)) paid++
    if (status.kind === 'partial') partial++
    if (amountDue !== null) {
      owed += Math.max(amountDue - received, 0)
      toReimburse += Math.max(received - amountDue, 0)
    }
  }
  return {
    paid,
    partial,
    total,
    collected,
    stillDue: amountDue === null ? null : (total - marks.length) * amountDue + owed,
    toReimburse,
    againstCosts: cost === null ? null : collected - cost,
    cost,
  }
}
export type PaymentTotals = ReturnType<typeof paymentTotals>
