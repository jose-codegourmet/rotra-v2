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

/**
 * One expiry cycle: the six-month countdown that starts when a license ends (`club_expiry_cycles`).
 * `expired` is the first unlicensed day; `cancelled` is the renewal that stopped the countdown.
 */
export type ClubExpiryCycle = {
  expired: string
  cancelled: string | null
}

/** A club's public-page retention record, as rotra-admin.html seeds `c.ret`. Dates are `YYYY-MM-DD`. */
export type ClubRetentionRecord = {
  clubId: string
  /** Earlier countdowns, oldest first */
  cycles: ClubExpiryCycle[]
  /** Last deletion attempt that failed and will be retried */
  failedOn: string | null
  /** The day the public session pages were actually deleted */
  deletedOn: string | null
}

/**
 * The club's public pages and retention countdown (A-RETENTION), shaped like rotra-admin.html
 * `retention(c)` so A02.8 can compute it as the prototype does. Dates are `YYYY-MM-DD`; `since` is the
 * first unlicensed day and `deleteOn` is six months later. 'due' and 'failed' never mean deleted:
 * only 'deleted' does, once deletion has actually finished.
 */
export type RetentionState =
  | { k: 'none' }
  /** The latest countdown a renewal cancelled */
  | { k: 'restored'; cycle: ClubExpiryCycle & { cancelled: string } }
  | {
      k: 'stale'
      deleteOn: string
      since: string
      /** Days from today to deleteOn */
      left: number
      /** Days of the countdown already passed, 0…total */
      elapsed: number
      /** Days from since to deleteOn */
      total: number
    }
  | { k: 'due'; deleteOn: string; since: string }
  | { k: 'failed'; deleteOn: string; failedOn: string; since: string }
  | { k: 'deleted'; on: string }
