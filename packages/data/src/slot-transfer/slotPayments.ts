import type { MockState } from '../mock/store'
import type { LedgerRefund } from '../session-payment/paymentRefund.rules'
import type { SessionPaymentMark } from '../session-payment/sessionPayment.types'
import { slotTransfersOf } from './closeSlotTransfers'
import type { SlotPaymentTransfer, SlotTransfer } from './slotTransfer.types'
import {
  type EntrySlotPayment,
  entrySlotPayment,
  slotTransferSteps,
} from './transferAccounting.rules'

/** The store's refunds (#1014); older saved states have none. */
export const paymentRefundsOf = (state: Pick<MockState, 'paymentRefunds'>) =>
  state.paymentRefunds ?? []

/**
 * Slot transfer accounting over the mock store (#1013, D-2026-11-22-05): every reader of payment
 * marks (Payments checklist, payment status share, public share, Approve's waiver preview) goes
 * through here, so cash is counted once across a chain of transfers and a waiver is never cash.
 * #1014: manual refunds come off the refunded entry's cash (net kept), never off a mark.
 */
export function slotPaymentsIn(
  state: Pick<MockState, 'paymentMarks' | 'slotTransfers' | 'paymentRefunds'>,
  sessionId: string,
  amountDue: number | null,
) {
  const transfers = slotTransfersOf(state).filter((t) => t.sessionId === sessionId)
  const refunds: LedgerRefund[] = paymentRefundsOf(state)
    .filter((r) => r.sessionId === sessionId)
    .map((r) => ({ pid: r.sessionPlayerId, amountMinor: r.amountMinor, refundedAt: r.refundedAt }))
  const markOf = (entryId: string): SessionPaymentMark | undefined =>
    state.paymentMarks.find((m) => m.sessionId === sessionId && m.sessionPlayerId === entryId)
  return {
    transfers,
    refunds,
    markOf,
    /** The refund recorded on an entry (#1014), or undefined */
    refundOf: (entryId: string) =>
      paymentRefundsOf(state).find(
        (r) => r.sessionId === sessionId && r.sessionPlayerId === entryId,
      ),
    /** The entry's payment: own mark (unless frozen into a transfer it sent) plus carried cash */
    paymentOf: (entryId: string): EntrySlotPayment =>
      entrySlotPayment({ entryId, ownMark: markOf(entryId), transfers, amountDue, refunds }),
  }
}

/** The Slot history steps of a transferred-in entry, with names from the store, or undefined. */
export function slotPaymentTransfer(
  state: Pick<MockState, 'clubPlayers' | 'roster'>,
  payment: EntrySlotPayment,
): SlotPaymentTransfer | undefined {
  if (!payment.chain.length || !payment.mark) return undefined
  const nameOf = (clubPlayerId: string | null, entryId: string | null) =>
    state.clubPlayers.find((p) => p.id === clubPlayerId)?.fullName ??
    state.roster.find((r) => r.id === entryId)?.nameSnapshot ??
    'A player'
  const steps = slotTransferSteps(payment.chain as SlotTransfer[], (t) => ({
    fromName: nameOf(t.senderClubPlayerId, t.pid),
    toName: nameOf(t.recipientClubPlayerId, t.recipientPid),
    viaLink: !!t.linkTokenDigest,
  }))
  return { waivedMinor: payment.mark.waivedMinor, steps }
}
