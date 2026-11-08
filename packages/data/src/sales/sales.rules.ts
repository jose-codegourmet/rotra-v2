import { addDays, diffDays } from '../license/license.rules'
import type { LicensePlan } from '../license/license.types'
import type {
  ClubSalesMonth,
  ClubSalesReport,
  PlatformSalesReport,
  SalesBucket,
  SalesBucketUnit,
  SalesChange,
  SalesClubActivity,
  SalesInput,
  SalesMetric,
  SalesMoney,
  SalesPayment,
  SalesPeriod,
} from './sales.types'

/**
 * Admin Sales math (D-2026-11-08-01), pure: rows in, report out. It follows rotra-admin.html
 * `salesData()`, `viewSales()` and `clubSales()` exactly:
 * - Revenue is the recorded license payments, counted on the day (and month) they were paid.
 * - Free (tester) clubs pay ₱0 but count in sessions started and matches played.
 * - Sessions and matches count on the day the session went live.
 * - The comparison needs the whole earlier period to start on or after the first licensed day.
 */

/** Platform page lists: latest payments and most active clubs (rotra-admin.html `.slice(0, 6)`). */
export const SALES_LIST_LIMIT = 6
/** Club Sales tab: the last six months, this month included. */
export const CLUB_SALES_MONTHS = 6

export const SALES_PERIODS: readonly SalesPeriod[] = ['7d', '30d', '12m']
export const DEFAULT_SALES_PERIOD: SalesPeriod = '30d'

const PLANS: readonly LicensePlan[] = ['Monthly', 'Yearly']

export const peso = (amountMinor: number): SalesMoney => ({ amountMinor, currency: 'PHP' })

function partsOf(ymd: string): [number, number] {
  const [y = 0, m = 1] = ymd.split('-').map(Number)
  return [y, m]
}
const pad = (n: number) => String(n).padStart(2, '0')
/** Months from the month of `ymd` to the month of `today` (0 for the same month). */
const monthsAgo = (ymd: string, today: string) => {
  const [y, m] = partsOf(ymd),
    [ty, tm] = partsOf(today)
  return ty * 12 + tm - (y * 12 + m)
}
/** First day of the month `n` months before the month of `today`. */
function monthStart(today: string, n: number): string {
  const [ty, tm] = partsOf(today)
  const index = ty * 12 + (tm - 1) - n
  return `${Math.floor(index / 12)}-${pad((index % 12) + 1)}-01`
}

export function salesBucketUnit(period: SalesPeriod): SalesBucketUnit {
  return period === '12m' ? 'month' : 'day'
}
export function salesBucketCount(period: SalesPeriod): number {
  return period === '12m' ? 12 : period === '7d' ? 7 : 30
}

/**
 * Bucket index of a day: 0 is the oldest bar of the shown period; `offset` 1 maps the period before
 * onto the same bars for the comparison. Outside 0…count-1 means the day is not in that period.
 */
function bucketOf(period: SalesPeriod, ymd: string, today: string, offset: 0 | 1): number {
  const count = salesBucketCount(period)
  const ago = salesBucketUnit(period) === 'month' ? monthsAgo(ymd, today) : diffDays(ymd, today)
  return count - 1 - (ago - offset * count)
}

/** The change chip (rotra-admin.html viewSales kpi()). */
export function salesChange(current: number, previous: number, comparable: boolean): SalesChange {
  if (!comparable) return { kind: 'no-history' }
  if (previous === 0) return current === 0 ? { kind: 'no-change' } : { kind: 'new' }
  return { kind: 'change', percent: Math.round(((current - previous) / previous) * 100) }
}

/** First day of the period before the shown one. */
function previousPeriodStart(period: SalesPeriod, today: string): string {
  const count = salesBucketCount(period)
  return salesBucketUnit(period) === 'month'
    ? monthStart(today, 2 * count - 1)
    : addDays(today, -(2 * count - 1))
}

function bucketStarts(period: SalesPeriod, today: string): string[] {
  const count = salesBucketCount(period),
    monthly = salesBucketUnit(period) === 'month'
  return Array.from({ length: count }, (_, i) =>
    monthly ? monthStart(today, count - 1 - i) : addDays(today, -(count - 1 - i)),
  )
}

type Series = { cur: number[]; prev: number[] }

function metricOf<V>(
  series: Series,
  starts: string[],
  comparable: boolean,
  wrap: (n: number) => V,
): SalesMetric<V> {
  const sum = (values: number[]) => values.reduce((total, v) => total + v, 0)
  const current = sum(series.cur),
    previous = sum(series.prev)
  return {
    value: wrap(current),
    previous: wrap(previous),
    change: salesChange(current, previous, comparable),
    buckets: starts.map((start, i): SalesBucket<V> => ({ start, value: wrap(series.cur[i] ?? 0) })),
  }
}

/** A-SALES for one period. */
export function platformSalesReport(input: SalesInput, period: SalesPeriod): PlatformSalesReport {
  const { today } = input,
    count = salesBucketCount(period)
  const series = (): Series => ({ cur: Array(count).fill(0), prev: Array(count).fill(0) })
  const revenue = series(),
    sessions = series(),
    matches = series()
  const add = (target: Series, ymd: string, value: number) => {
    for (const [key, offset] of [
      ['cur', 0],
      ['prev', 1],
    ] as const) {
      const b = bucketOf(period, ymd, today, offset)
      if (b >= 0 && b < count) target[key][b] = (target[key][b] ?? 0) + value
    }
  }
  const inPeriod = (ymd: string) => {
    const b = bucketOf(period, ymd, today, 0)
    return b >= 0 && b < count
  }

  // Per club in club order, so ties in Most active clubs keep the directory order.
  const activity = new Map<string, { sessions: number; matches: number; revenue: number }>()
  const activityOf = (clubId: string) => {
    let row = activity.get(clubId)
    if (!row) {
      row = { sessions: 0, matches: 0, revenue: 0 }
      activity.set(clubId, row)
    }
    return row
  }
  const nameOf = new Map(input.clubs.map((club) => [club.id, club.name]))
  const paymentsInPeriod: SalesPayment[] = []
  for (const club of input.clubs) {
    for (const payment of input.payments) {
      if (payment.clubId !== club.id) continue
      add(revenue, payment.paidOn, payment.amountMinor)
      if (!inPeriod(payment.paidOn)) continue
      paymentsInPeriod.push({
        termId: payment.termId,
        clubId: club.id,
        clubName: club.name,
        plan: payment.plan,
        paidOn: payment.paidOn,
        amount: peso(payment.amountMinor),
      })
      activityOf(club.id).revenue += payment.amountMinor
    }
    for (const session of input.sessions) {
      if (session.clubId !== club.id) continue
      add(sessions, session.startedOn, 1)
      add(matches, session.startedOn, session.matches)
      if (!inPeriod(session.startedOn)) continue
      const row = activityOf(club.id)
      row.sessions += 1
      row.matches += session.matches
    }
  }

  const firstLicensed = input.payments.map((p) => p.startsAt).sort()[0] ?? today
  const comparable = previousPeriodStart(period, today) >= firstLicensed
  const starts = bucketStarts(period, today)
  paymentsInPeriod.sort(
    (a, b) => b.paidOn.localeCompare(a.paidOn) || b.termId.localeCompare(a.termId),
  )

  const mostActiveClubs: SalesClubActivity[] = [...activity.entries()]
    .filter(([, row]) => row.sessions > 0 || row.revenue > 0)
    .sort(([, a], [, b]) => b.matches - a.matches || b.revenue - a.revenue)
    .slice(0, SALES_LIST_LIMIT)
    .map(([clubId, row]) => ({
      clubId,
      clubName: nameOf.get(clubId) ?? '',
      sessions: row.sessions,
      matches: row.matches,
      paid: peso(row.revenue),
    }))

  return {
    period,
    bucketUnit: salesBucketUnit(period),
    today,
    from: starts[0] ?? today,
    to: today,
    revenue: metricOf(revenue, starts, comparable, peso),
    sessionsStarted: metricOf(sessions, starts, comparable, (n) => n),
    matchesPlayed: metricOf(matches, starts, comparable, (n) => n),
    revenueByPlan: PLANS.map((plan) => {
      const list = paymentsInPeriod.filter((p) => p.plan === plan)
      return {
        plan,
        total: peso(list.reduce((total, p) => total + p.amount.amountMinor, 0)),
        payments: list.length,
      }
    }),
    recentPayments: paymentsInPeriod.slice(0, SALES_LIST_LIMIT),
    mostActiveClubs,
  }
}

/** Paid divided by sessions, rounded to the centavo; null with no sessions. */
const perSession = (paidMinor: number, sessions: number) =>
  sessions ? peso(Math.round(paidMinor / sessions)) : null

/**
 * A-CLUB-SALES: the last six months for one club, oldest first. Estimated cost is sessions times the
 * Admin cost per session; left over is paid minus that. null when the club is not in the input.
 */
export function clubSalesReport(
  input: SalesInput,
  clubId: string,
  costPerSession: SalesMoney,
): ClubSalesReport | null {
  const club = input.clubs.find((row) => row.id === clubId)
  if (!club) return null
  const { today } = input
  const cost = costPerSession.amountMinor
  const months: ClubSalesMonth[] = []
  for (let i = CLUB_SALES_MONTHS - 1; i >= 0; i--) {
    const month = monthStart(today, i).slice(0, 7)
    const inMonth = (ymd: string) => ymd.slice(0, 7) === month && ymd <= today
    const paid = input.payments
      .filter((p) => p.clubId === clubId && inMonth(p.paidOn))
      .reduce((total, p) => total + p.amountMinor, 0)
    const started = input.sessions.filter((s) => s.clubId === clubId && inMonth(s.startedOn))
    const sessions = started.length
    const matches = started.reduce((total, s) => total + s.matches, 0)
    months.push({
      month,
      paid: peso(paid),
      sessions,
      matches,
      paidPerSession: paid ? perSession(paid, sessions) : null,
      estimatedCost: peso(sessions * cost),
      leftOver: peso(paid - sessions * cost),
    })
  }
  const total = months.reduce(
    (t, m) => ({
      paid: t.paid + m.paid.amountMinor,
      sessions: t.sessions + m.sessions,
      matches: t.matches + m.matches,
      cost: t.cost + m.estimatedCost.amountMinor,
    }),
    { paid: 0, sessions: 0, matches: 0, cost: 0 },
  )
  return {
    clubId,
    today,
    pricing: club.pricing,
    monthlyListPrice: club.pricing === 'free' ? null : peso(club.monthlyListMinor),
    costPerSession: peso(cost),
    months,
    totals: {
      paid: peso(total.paid),
      sessions: total.sessions,
      matches: total.matches,
      paidPerSession: perSession(total.paid, total.sessions),
      estimatedCost: peso(total.cost),
      leftOver: peso(total.paid - total.cost),
    },
  }
}
