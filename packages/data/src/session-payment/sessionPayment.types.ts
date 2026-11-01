export type SessionPaymentMark = {
  sessionId: string
  sessionPlayerId: string
  amountMinor: number
  currency: 'PHP'
  markedAt: number
}

export type SetPaymentMarksInput = {
  sessionId: string
  marks: { clubPlayerId: string; paid: boolean }[]
}
