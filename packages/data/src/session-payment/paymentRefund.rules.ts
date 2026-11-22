/**
 * Manual full refunds (#1014, epic #1009; owner decisions 2026-11-22, #1015; D-2026-11-22-06).
 * Pure; integer centavos. **ROTRA moves no money:** a refund is an informational record that the
 * Queue Master handed cash back outside ROTRA. It is append-only (one per roster entry) and never
 * changes or removes the payment marks it refunds.
 *
 * - **Full refunds only.** The amount is the whole cash actually collected for the slot (the
 *   holder's own cash plus cash an approved transfer carried in, #1013), never a waived amount.
 * - **Two ways in:** Requests › Slot transfers › **Reject and refund** (the sender's registration is
 *   cancelled and the slot freed for the waitlist, FIFO), and a cancelled session's **Refund
 *   everyone who paid** list (one record per paid or partially paid player).
 * - **Net kept.** Every reader counts a refunded entry's cash net of its refund: collected (net
 *   kept) = cash received − cash refunded. The refund itself is shown on its own line.
 */
import { formatPeso } from '@rotra/schema/money'
import { paymentStatus } from './sessionPayment.rules'

/** Why a refund was recorded */
export type PaymentRefundReason = 'transfer_rejected' | 'session_cancelled'

/** The fields of a refund the readers use (mock rows and database rows both fit). */
export type LedgerRefund = {
  /** The roster entry refunded (`SessionPlayer.id`) */
  pid: string
  amountMinor: number
  refundedAt: number
}

/** The cash refunded on one entry so far (0 or one full refund; summed defensively). */
export function refundedFor(refunds: readonly LedgerRefund[] | undefined, entryId: string): number {
  if (!refunds) return 0
  return refunds
    .filter((r) => r.pid === entryId)
    .reduce((sum, r) => sum + Math.max(r.amountMinor, 0), 0)
}

/** Cash the club still keeps for an entry: cash received minus cash refunded, never below 0. */
export function netKeptCash(cashMinor: number, refundedMinor: number): number {
  return Math.max(Math.max(cashMinor, 0) - Math.max(refundedMinor, 0), 0)
}

/**
 * The full refund for an entry: all the cash it still holds (already net of any earlier refund).
 * 0 means there is nothing to hand back, so no refund can be recorded (a waiver is never refunded).
 */
export function fullRefundAmount(netCashMinor: number): number {
  return Math.max(netCashMinor, 0)
}

/** One line of a cancelled session's **Refund everyone who paid** list. */
export type RefundListRow = {
  entryId: string
  name: string
  /** Paid (Paid in full or Reimburse) or Partial, from the cash received before any refund */
  status: 'paid' | 'partial'
  /** What to hand back (not recorded yet) or what was recorded */
  amountMinor: number
  /** The manual refund is recorded; `refundedAt` is its time */
  recorded: boolean
  refundedAt: number | null
}

export type RefundListInput = {
  entryId: string
  name: string
  /** Cash received for the slot before any refund (own + carried), centavos */
  receivedMinor: number
  /** Waived on the slot by transfers (a record, never cash, never refunded) */
  waivedMinor: number
  /** The refund recorded on this entry, or null */
  refund: { amountMinor: number; refundedAt: number } | null
}

export type RefundList = {
  rows: RefundListRow[]
  /** Σ amounts still to hand back */
  leftMinor: number
  /** Σ refunds recorded */
  refundedMinor: number
  /** Rows still to record */
  leftCount: number
}

/**
 * Everyone on a cancelled session's roster who paid cash (Paid, Reimburse or Partial), with the
 * amount to refund each: their whole cash, never a waiver. A slot that holds only a waiver (nothing
 * paid) is not listed. Recorded refunds stay listed as done. Callers pass rows sorted by name.
 */
export function refundList(rows: readonly RefundListInput[], amountDue: number | null): RefundList {
  const out: RefundListRow[] = []
  for (const row of rows) {
    const received = Math.max(row.receivedMinor, 0)
    if (received <= 0 && !row.refund) continue
    const status = paymentStatus(
      { amountMinor: received, waivedMinor: Math.max(row.waivedMinor, 0) },
      amountDue,
    )
    out.push({
      entryId: row.entryId,
      name: row.name,
      status: status.kind === 'partial' ? 'partial' : 'paid',
      amountMinor: row.refund ? row.refund.amountMinor : fullRefundAmount(received),
      recorded: !!row.refund,
      refundedAt: row.refund?.refundedAt ?? null,
    })
  }
  const left = out.filter((r) => !r.recorded)
  return {
    rows: out,
    leftMinor: left.reduce((sum, r) => sum + r.amountMinor, 0),
    refundedMinor: out.filter((r) => r.recorded).reduce((sum, r) => sum + r.amountMinor, 0),
    leftCount: left.length,
  }
}

/**
 * FIFO waitlist promotion after a slot is freed (#1014): the first waitlisted person, in the
 * waitlist's own order, who has a level for this club (Give slot needs one), while a slot is open.
 * Null when no slot is open (an over-full roster stays as it is) or nobody is eligible.
 */
export function firstEligibleWaiter<T>(
  ordered: readonly T[],
  openSlots: number,
  hasLevel: (entry: T) => boolean,
): T | null {
  if (openSlots <= 0) return null
  return ordered.find(hasLevel) ?? null
}

/** The Reject and refund dialog's amount line. */
export const rejectRefundText = (senderName: string, amountMinor: number) =>
  `Hand ${formatPeso(amountMinor)} back to ${senderName} outside ROTRA. ROTRA only records the refund; it moves no money.`

export const transferRefundToast = (
  senderName: string,
  amountMinor: number,
  promotedName: string | null,
) =>
  `Transfer rejected · ${formatPeso(amountMinor)} refund recorded for ${senderName}${
    promotedName ? ` · ${promotedName} got the slot from the waitlist` : ' · the slot is open'
  }`

export const sessionRefundToast = (name: string, amountMinor: number) =>
  `Refund recorded · ${formatPeso(amountMinor)} to ${name}`

export const REFUND_NOTHING_PAID_ERROR =
  'Nothing was paid for this slot, so there is nothing to refund. Use Reject instead.'
export const REFUND_CHANGED_ERROR = (amount: string) =>
  `The payment for this slot changed: the full refund is now ${amount}. Check and try again.`
export const REFUND_NOT_CANCELLED_ERROR = 'Refunds are recorded only for a cancelled session.'
export const REFUND_NOTHING_TO_REFUND_ERROR = 'This player has no cash to refund.'
export const PAYMENT_REFUNDED_LOCKED_ERROR =
  "This player's payment was refunded, so it can't be changed here."
