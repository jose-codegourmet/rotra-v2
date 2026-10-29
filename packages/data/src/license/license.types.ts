export type ClubLicenseTerm = {
  id: string
  clubId: string
  plan: 'Monthly' | 'Yearly'
  startsAt: string
  endsAt: string
  amountMinor: number
  currency: 'PHP'
  paidOn: string | null
  paymentReference: string
}

export type ClubAccess = {
  status: 'active' | 'expired' | 'unverified'
  activeSessionId: string | null
}

/**
 * One club's license access as the Admin directory shows it (A-CLUBS `access(c)` in rotra-admin.html).
 * Dates are `YYYY-MM-DD`; `days` counts whole days from today to `until`. Computed by A02.8; display
 * components only format it. Named apart from `ClubAccess`, which is the Queue app's gate state.
 */
export type ClubAccessState =
  | { state: 'active'; plan: ClubLicenseTerm['plan']; until: string; days: number }
  | {
      state: 'expired'
      plan: ClubLicenseTerm['plan']
      /** Last licensed day */
      ended: string
      /** First unlicensed day */
      since: string
      /** Start of a future term already recorded, if any */
      next: string | null
    }
  | { state: 'scheduled'; plan: ClubLicenseTerm['plan']; starts: string }
  | { state: 'none' }
