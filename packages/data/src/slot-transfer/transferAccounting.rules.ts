/**
 * Slot transfer accounting (#1013, epic #1009; owner decisions 2026-11-22, #1015; D-2026-11-22-05).
 * Pure; integer centavos. ROTRA moves no money: a waiver is a record, never cash.
 *
 * - On approval the recipient is **Paid in Full** and owes ₱0. What the slot still owed (amount due
 *   now − cash collected for the slot − waivers already recorded on it) is recorded as an automatic
 *   **waiver** on the transfer row. An unpaid slot transfers the same way: the whole amount due is
 *   waived (assumption, D-2026-11-22-05).
 * - **Cash never moves.** The sender's payment mark stays exactly as recorded on their released
 *   entry; the transfer row snapshots the slot's cash so the recipient's entry carries it. Collected
 *   totals therefore count each peso once: the live holder's carried cash plus their own mark.
 * - **Repeat transfers** append a new approved row. The chain is read from the rows (append-only):
 *   each approval's `sender` entry is the previous approval's `recipient` entry.
 */
import { formatPeso } from '@rotra/schema/money'
import { type LedgerRefund, netKeptCash, refundedFor } from '../session-payment/paymentRefund.rules'
import { receivedAmount } from '../session-payment/sessionPayment.rules'

/** The money an approval writes on the transfer row, once; never changed after. */
export type TransferPaymentSnapshot = {
  /** Amount due per player at approval; null with no fee set */
  amountDueMinor: number | null
  /** Cash collected for this slot by every holder so far (the sender's slot cash at approval) */
  paidMinor: number
  /** Waivers recorded on this slot by earlier approvals in the chain */
  priorWaivedMinor: number
  /** The waiver this approval records (what the slot still owed), never below 0 */
  waivedMinor: number
}

/** What a slot holds: cash collected for it and amounts waived on it. */
export type SlotHolding = { cashMinor: number; waivedMinor: number }

/** The waiver an approval records now: the amount due minus cash and earlier waivers, at least 0. */
export function transferWaiver(amountDue: number | null, holding: SlotHolding | null): number {
  if (amountDue === null) return 0
  const cash = Math.max(holding?.cashMinor ?? 0, 0)
  const waived = Math.max(holding?.waivedMinor ?? 0, 0)
  return Math.max(amountDue - cash - waived, 0)
}

/** The snapshot the approval writes, from the sender's slot holding and today's amount due. */
export function transferSnapshot(
  amountDue: number | null,
  holding: SlotHolding | null,
): TransferPaymentSnapshot {
  return {
    amountDueMinor: amountDue,
    paidMinor: Math.max(holding?.cashMinor ?? 0, 0),
    priorWaivedMinor: Math.max(holding?.waivedMinor ?? 0, 0),
    waivedMinor: transferWaiver(amountDue, holding),
  }
}

/** What an approved transfer carries into the recipient's entry: the slot's cash and every waiver. */
export function carriedHolding(snapshot: TransferPaymentSnapshot): SlotHolding {
  return {
    cashMinor: snapshot.paidMinor,
    waivedMinor: snapshot.priorWaivedMinor + snapshot.waivedMinor,
  }
}

/** The fields of a transfer the accounting reads (mock `SlotTransfer` and real rows both fit). */
export type LedgerTransfer = {
  id: string
  /** The sender's roster entry */
  pid: string
  /** The entry that took the slot; set on approval */
  recipientPid: string | null
  status: string
  decidedAt: number | null
  /** Missing on a row approved before #1013 (local databases only): it carries nothing */
  payment?: TransferPaymentSnapshot | null
}

const approvedOf = <T extends LedgerTransfer>(transfers: readonly T[]) =>
  transfers.filter((t) => t.status === 'approved' && t.decidedAt !== null)

/**
 * The approved transfers that brought the slot to this entry, oldest first (empty when the entry
 * holds its own slot). Each step's sender entry is the previous step's recipient entry. An entry
 * that sent its slot away after receiving it no longer holds the carried slot: empty.
 */
export function transferChain<T extends LedgerTransfer>(
  transfers: readonly T[],
  entryId: string,
): T[] {
  const approved = approvedOf(transfers)
  const latest = (pred: (t: T) => boolean, before = Number.POSITIVE_INFINITY) =>
    approved
      .filter((t) => pred(t) && (t.decidedAt as number) <= before)
      .sort((a, b) => (b.decidedAt as number) - (a.decidedAt as number))[0]
  const incoming = latest((t) => t.recipientPid === entryId)
  if (!incoming) return []
  const outgoing = latest((t) => t.pid === entryId)
  if (outgoing && (outgoing.decidedAt as number) >= (incoming.decidedAt as number)) return []
  const chain: T[] = [incoming]
  const seen = new Set([incoming.id])
  for (;;) {
    const first = chain[0] as T
    const previous = latest(
      (t) => t.recipientPid === first.pid && !seen.has(t.id),
      first.decidedAt as number,
    )
    if (!previous) break
    seen.add(previous.id)
    chain.unshift(previous)
  }
  return chain
}

/**
 * The entry's own mark is frozen when the entry gave its slot away after the mark was recorded:
 * that cash now belongs to the slot (carried by the recipient), so it is not counted on this entry
 * again and can never be changed (a database trigger backs this in real mode).
 */
export function isMarkFrozen(
  transfers: readonly LedgerTransfer[],
  entryId: string,
  mark: { markedAt: number } | null | undefined,
): boolean {
  if (!mark) return false
  return approvedOf(transfers).some(
    (t) => t.pid === entryId && (t.decidedAt as number) >= mark.markedAt,
  )
}

/** One roster entry's payment, with the slot's transfer history. */
export type EntrySlotPayment = {
  /**
   * The payment to show and total: own cash plus carried cash (`amountMinor`) and every waiver on
   * the slot (`waivedMinor`). Null: nothing paid, nothing carried. A legacy own mark with no amount
   * keeps `amountMinor: null` when nothing is carried (paid in full at today's amount due).
   */
  mark: { amountMinor: number | null; waivedMinor: number } | null
  /** The approved transfers that brought the slot here, oldest first; empty for an own slot */
  chain: LedgerTransfer[]
  /** The own mark is frozen into a transfer this entry sent (not counted here) */
  frozen: boolean
  /**
   * Cash refunded on this entry (#1014, D-2026-11-22-06), already taken out of `mark.amountMinor`
   * (which is the cash the club still keeps). 0 when nothing was refunded.
   */
  refundedMinor: number
}

/**
 * A live roster entry's payment: its own mark (unless frozen) plus what the last approved transfer
 * carried into it. Cash is counted once across the chain: the senders' entries are off the roster.
 * #1014: a manual refund recorded on the entry comes off its cash (net kept = received − refunded,
 * never below 0); the payment marks themselves never change.
 */
export function entrySlotPayment(input: {
  entryId: string
  ownMark: { amountMinor: number | null; markedAt: number } | null | undefined
  transfers: readonly LedgerTransfer[]
  amountDue: number | null
  /** Refunds recorded in this session (#1014); missing means none */
  refunds?: readonly LedgerRefund[]
}): EntrySlotPayment {
  const frozen = isMarkFrozen(input.transfers, input.entryId, input.ownMark)
  const own = input.ownMark && !frozen ? input.ownMark : null
  const chain = transferChain(input.transfers, input.entryId)
  const last = chain[chain.length - 1]
  const refundedMinor = refundedFor(input.refunds, input.entryId)
  if (!last) {
    if (!own) return { mark: null, chain, frozen, refundedMinor }
    // A legacy own mark with no amount keeps null unless a refund needs the number.
    const amountMinor = refundedMinor
      ? netKeptCash(receivedAmount(own, input.amountDue), refundedMinor)
      : own.amountMinor
    return { mark: { amountMinor, waivedMinor: 0 }, chain, frozen, refundedMinor }
  }
  const carried = last.payment ? carriedHolding(last.payment) : { cashMinor: 0, waivedMinor: 0 }
  return {
    mark: {
      amountMinor: netKeptCash(
        receivedAmount(own, input.amountDue) + carried.cashMinor,
        refundedMinor,
      ),
      waivedMinor: carried.waivedMinor,
    },
    chain,
    frozen,
    refundedMinor,
  }
}

/** The slot's holding as cash and waived, for the next approval's snapshot. */
export function holdingOf(payment: EntrySlotPayment, amountDue: number | null): SlotHolding | null {
  if (!payment.mark) return null
  return {
    cashMinor: receivedAmount(payment.mark, amountDue),
    waivedMinor: payment.mark.waivedMinor,
  }
}

/** One step of a slot's transfer history, for the Queue Master's Slot history sheet. */
export type SlotTransferStep = {
  transferId: string
  fromName: string
  toName: string
  /** Cash the giver paid themselves (the first step's giver is the original payer) */
  paidByGiverMinor: number
  /** Cash collected for the slot at this approval, every holder so far */
  slotPaidMinor: number
  /** The waiver this approval recorded */
  waivedMinor: number
  amountDueMinor: number | null
  approvedAt: number
  viaLink: boolean
}

/**
 * The history steps of a chain, oldest first. A giver's own cash is the step's slot cash minus the
 * previous step's; a row approved before #1013 shows nothing paid or waived.
 */
export function slotTransferSteps<T extends LedgerTransfer>(
  chain: readonly T[],
  names: (t: T) => { fromName: string; toName: string; viaLink: boolean },
): SlotTransferStep[] {
  let before = 0
  return chain.map((t) => {
    const slotPaid = t.payment?.paidMinor ?? 0
    const step = {
      transferId: t.id,
      ...names(t),
      paidByGiverMinor: Math.max(slotPaid - before, 0),
      slotPaidMinor: slotPaid,
      waivedMinor: t.payment?.waivedMinor ?? 0,
      amountDueMinor: t.payment?.amountDueMinor ?? null,
      approvedAt: t.decidedAt as number,
    }
    before = slotPaid
    return step
  })
}

/** The Queue Master's Approve line: what the approval will waive, shown before approving. */
export function transferWaiverText(snapshot: TransferPaymentSnapshot) {
  if (snapshot.amountDueMinor === null) return 'No fee set: nothing to waive.'
  const paid = `${formatPeso(snapshot.paidMinor)} paid`
  if (!snapshot.waivedMinor) return `${paid} · fully paid, nothing to waive.`
  return `${paid} · ${formatPeso(snapshot.waivedMinor)} will be waived.`
}

export const TRANSFER_WAIVER_CHANGED_ERROR = (waived: string) =>
  `The payment for this slot changed: approving now waives ${waived}. Check and approve again.`
export const TRANSFER_PAYMENT_LOCKED_ERROR =
  "This slot was paid through a slot transfer, so its payment can't be changed here."
