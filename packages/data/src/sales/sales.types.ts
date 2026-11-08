import type { LicensePlan } from '../license/license.types'

/**
 * Admin Sales (A-SALES, A-CLUB-SALES; D-2026-11-08-01). Every DTO here is what the screen receives,
 * in mock mode from `sales.rules` over the mock store and later (A06.4) from an Admin Route Handler
 * reading the Postgres views, with identical shapes. Dates are Manila calendar days, `YYYY-MM-DD`.
 */

/** Integer minor units (centavos), as license terms store them. Never a float. */
export type SalesMoney = { amountMinor: number; currency: 'PHP' }

/** A-SALES period switch: Last 7 days, Last 30 days (default), Last 12 months. */
export type SalesPeriod = '7d' | '30d' | '12m'

/** Days are daily bars; 12 months is monthly bars. */
export type SalesBucketUnit = 'day' | 'month'

/**
 * The change chip against the period before (rotra-admin.html viewSales kpi()):
 * - `no-history`: the earlier period starts before the first recorded license
 * - `no-change`: both periods are zero
 * - `new`: the earlier period is zero, this one is not
 * - `change`: whole percent, signed (0 when equal and non-zero)
 */
export type SalesChange =
  | { kind: 'no-history' }
  | { kind: 'no-change' }
  | { kind: 'new' }
  | { kind: 'change'; percent: number }

/** One chart bar. `start` is the day, or the first day of the month for monthly bars. */
export type SalesBucket<V> = { start: string; value: V }

/** One number card: the period total, the period before, the chip and the bars (oldest first). */
export type SalesMetric<V> = {
  value: V
  previous: V
  change: SalesChange
  buckets: SalesBucket<V>[]
}

/** One recorded license payment in the period. A free club's term reads ₱0 (shown as Free). */
export type SalesPayment = {
  termId: string
  clubId: string
  clubName: string
  plan: LicensePlan
  /** The day the payment was recorded as paid; a free term uses the day it was recorded */
  paidOn: string
  amount: SalesMoney
}

/** Revenue by plan: the plan's total and how many payments made it. */
export type SalesPlanTotal = { plan: LicensePlan; total: SalesMoney; payments: number }

/** Most active clubs row: sessions, matches and money paid in the period. */
export type SalesClubActivity = {
  clubId: string
  clubName: string
  sessions: number
  matches: number
  paid: SalesMoney
}

/** A-SALES for one period. */
export type PlatformSalesReport = {
  period: SalesPeriod
  bucketUnit: SalesBucketUnit
  /** The day the report was computed for (Manila) */
  today: string
  /** First and last day of the shown period */
  from: string
  to: string
  revenue: SalesMetric<SalesMoney>
  sessionsStarted: SalesMetric<number>
  matchesPlayed: SalesMetric<number>
  /** Monthly, then Yearly */
  revenueByPlan: SalesPlanTotal[]
  /** The latest six payments in the period, newest first */
  recentPayments: SalesPayment[]
  /** Up to six clubs with sessions or money paid, by matches then money paid */
  mostActiveClubs: SalesClubActivity[]
}

/** One month of A-CLUB-SALES › Month by month. */
export type ClubSalesMonth = {
  /** `YYYY-MM` */
  month: string
  paid: SalesMoney
  sessions: number
  matches: number
  /** Paid divided by sessions; null when the month has no sessions or no payment */
  paidPerSession: SalesMoney | null
  /** Sessions times the cost per session */
  estimatedCost: SalesMoney
  /** Paid minus estimated cost; negative when the cost is higher */
  leftOver: SalesMoney
}

/** A-CLUB-SALES: what one club paid ROTRA against how much it used ROTRA, last six months. */
export type ClubSalesReport = {
  clubId: string
  today: string
  pricing: 'paid' | 'free'
  /** The club's monthly list price; null for a free (tester) club */
  monthlyListPrice: SalesMoney | null
  /** The Admin configuration figure the estimate used */
  costPerSession: SalesMoney
  /** Oldest first; the last is the current month up to today */
  months: ClubSalesMonth[]
  totals: {
    paid: SalesMoney
    sessions: number
    matches: number
    /** Paid divided by sessions; null when there were no sessions */
    paidPerSession: SalesMoney | null
    estimatedCost: SalesMoney
    leftOver: SalesMoney
  }
}

/**
 * The Admin configuration figure Sales reads (D-2026-11-08-01): one Admin-editable cost per session,
 * starting at the ₱15 placeholder until the owner sets the real figure.
 */
export type SalesSettings = { costPerSession: SalesMoney }

// ---------- Report inputs (pure rules take these; A06.4's views return the same facts) ----------

/** One started session that counts: a final (completed) session, or a sample row. */
export type SalesSessionRow = {
  clubId: string
  /** The Manila day it went live */
  startedOn: string
  /** Matches played in it */
  matches: number
}

/** A club as Sales needs it. */
export type SalesClubRow = {
  id: string
  name: string
  pricing: 'paid' | 'free'
  monthlyListMinor: number
}

/** A recorded license payment as Sales needs it (from `ClubLicenseTerm`). */
export type SalesPaymentRow = {
  termId: string
  clubId: string
  plan: LicensePlan
  /** Paid day, or the recorded day for a free term */
  paidOn: string
  amountMinor: number
  /** First licensed day; the earliest one decides whether the comparison has enough history */
  startsAt: string
}

export type SalesInput = {
  today: string
  clubs: SalesClubRow[]
  payments: SalesPaymentRow[]
  sessions: SalesSessionRow[]
}
