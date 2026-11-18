export type VerificationEmail =
  | { kind: 'google_missing' }
  | { kind: 'match'; rotraEmail: string; googleEmail: string }
  | { kind: 'mismatch'; rotraEmail: string; googleEmail: string; pendingEmailRequest: boolean }

/** Private verification details for the account owner and ROTRA Admin. */
export type AccountVerification = {
  playerId: string
  verified: boolean
  verifiedByAdmin: boolean
  completedSteps: 0 | 1 | 2 | 3
  googleEmail: string | null
  maskedPhone: string | null
  email: VerificationEmail
}

/** Admin always sees the full phone (D-2026-11-16-06): `phone` is E.164, or null when none is on file. */
export type AdminAccountVerification = AccountVerification & {
  revision: number
  phone: string | null
}

export type SetAdminVerificationOverrideInput = {
  playerId: string
  revision: number
  verifiedByAdmin: boolean
  reason: string
}

/** The only stored verification fact (D-2026-11-16-02). The reason lives in the Admin audit log. */
export type VerificationOverride = {
  status: 'verified'
  adminId: string
  at: string
}
