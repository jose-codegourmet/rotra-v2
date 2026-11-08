export type PasswordResetRequest = {
  id: string
  email: string
  playerId: string | null
  playerName: string | null
  rtrId: string | null
  status: 'pending' | 'issued' | 'declined'
  requestedAt: string
  reviewedAt: string | null
  reviewedBy: string | null
  canIssue: boolean
}
export type PasswordResetRequestList = { rows: PasswordResetRequest[]; total: number; page: number }
export type ReviewPasswordResetInput = {
  id: string
  action: 'issue' | 'decline'
  ownershipVerified: boolean
}
