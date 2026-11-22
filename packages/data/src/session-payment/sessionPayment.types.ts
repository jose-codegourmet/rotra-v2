export type SessionPaymentMark = {
  sessionId: string
  sessionPlayerId: string
  /** Amount received, in centavos (#479); a quick paid switch records the amount due then. */
  amountMinor: number
  currency: 'PHP'
  markedAt: number
}

export type SetPaymentMarksInput = {
  sessionId: string
  marks: { clubPlayerId: string; paid: boolean }[]
}

/** One player's amount received (#479), in centavos; 0 means not paid (the mark is removed). */
export type SetPaymentAmountInput = {
  sessionId: string
  clubPlayerId: string
  amountMinor: number
}

/**
 * A manual full refund (#1014, D-2026-11-22-06): the record that the Queue Master handed a roster
 * entry's whole cash back outside ROTRA. Append-only, one per entry; never changes a payment mark.
 * `transferId` is set for **Reject and refund** on a slot transfer, null for a cancelled session.
 */
export type SessionPaymentRefund = {
  id: string
  sessionId: string
  sessionPlayerId: string
  reason: 'transfer_rejected' | 'session_cancelled'
  transferId: string | null
  amountMinor: number
  currency: 'PHP'
  refundedAt: number
}

/** **Record refund** on a cancelled session's Refund everyone who paid list */
export type RecordSessionRefundInput = {
  sessionId: string
  sessionPlayerId: string
  /** The amount the Queue Master was shown; refused when it no longer matches */
  expectedAmountMinor: number
}
