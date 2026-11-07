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
