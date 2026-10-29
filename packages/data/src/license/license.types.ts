/** Monthly or yearly; the casing the Queue payment history and the Admin forms already show. */
export type LicensePlan = 'Monthly' | 'Yearly'

/**
 * One license term the platform owner recorded (`club_license_terms`): the payment history the club
 * sees and the source of access and retention. Dates are `YYYY-MM-DD`; `endsAt` is the last licensed
 * day. A free club's term is recorded at 0 with `paidOn` null. Never edited once recorded.
 */
export type ClubLicenseTerm = {
  id: string
  clubId: string
  plan: LicensePlan
  startsAt: string
  endsAt: string
  amountMinor: number
  currency: 'PHP'
  paidOn: string | null
  /** Short reference shown to the club, e.g. LIC-0004; may be empty */
  paymentReference: string
  /** Optional operational note */
  notes?: string
  /** ISO time the term was recorded */
  activatedAt: string
  activatedByEmail: string
  /** Idempotency key of the Activate/Renew command that recorded it */
  sourceCommandId: string
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
  | { state: 'active'; plan: LicensePlan; until: string; days: number }
  | {
      state: 'expired'
      plan: LicensePlan
      /** Last licensed day */
      ended: string
      /** First unlicensed day */
      since: string
      /** Start of a future term already recorded, if any */
      next: string | null
    }
  | { state: 'scheduled'; plan: LicensePlan; starts: string }
  | { state: 'none' }

/**
 * One expiry cycle: the six-month countdown that starts when a license ends (`club_expiry_cycles`).
 * `expired` is the first unlicensed day; `cancelled` is the renewal that stopped the countdown. The
 * mock records only cancelled cycles: the running one is derived from the terms (its delete date is
 * six months after `expired`), so a later expiry always starts a fresh countdown.
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

/** A-LICENSE's prefilled values (rotra-admin.html licStart()); amounts are integer centavos. */
export type LicenseDraft = {
  /** The club's latest plan; null when it never had one */
  plan: LicensePlan | null
  startsOn: string
  paidOn: string
  /** The club's price for the plan, 0 for a free club, null until a plan is chosen */
  amountMinor: number | null
  reference: string
}

/** What D-LICENSE › Activate/Renew license sends. One sourceCommandId per review, kept across retries. */
export type ActivateLicenseInput = {
  clubId: string
  plan: LicensePlan
  startsOn: string
  /** Ignored for a free club (recorded as null) */
  paidOn: string | null
  /** Ignored for a free club (recorded as 0) */
  amountMinor: number
  reference: string
  sourceCommandId: string
}

/** A recorded Activate/Renew command: the term it added and whether it was the club's first. */
export type LicenseOperation = {
  term: ClubLicenseTerm
  verb: 'Activated' | 'Renewed'
}
