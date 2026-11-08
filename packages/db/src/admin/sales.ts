import 'server-only'
import { manilaToday } from '@rotra/data/license/rules'
import type { LicensePlan } from '@rotra/data/license/types'
import {
  CLUB_SALES_MONTHS,
  DEFAULT_SALES_PERIOD,
  peso,
  SALES_LIST_LIMIT,
  SALES_PERIODS,
  salesBucketUnit,
  salesChange,
} from '@rotra/data/sales/rules'
import type {
  ClubSalesMonth,
  ClubSalesReport,
  PlatformSalesReport,
  SalesMetric,
  SalesMoney,
  SalesPeriod,
} from '@rotra/data/sales/types'
import type { AdminContext } from '../auth/account-context'
import { prisma } from '../client/prisma'
import { ServiceError } from '../service/errors'

/**
 * Admin Sales (D-2026-11-08-01). Postgres computes every total on read
 * (`rotra_sales_*` in migration 20261108000300_admin_sales_reports); this module only shapes the
 * rows into the `@rotra/data` Sales DTOs, reusing its pure change chip. Real rows only: the mock's
 * sample session history never appears here.
 */

type BucketRow = {
  bucket_index: number
  bucket_start: string
  previous_start: string
  revenue_minor: bigint
  sessions: number
  matches: number
  previous_revenue_minor: bigint
  previous_sessions: number
  previous_matches: number
  first_licensed_on: string | null
}
type PlanRow = { plan: string; total_minor: bigint; payments: number }
type PaymentRow = {
  term_id: string
  club_id: string
  club_name: string
  plan: string
  paid_on: string
  amount_minor: number
}
type ClubActivityRow = {
  club_id: string
  club_name: string
  sessions: number
  matches: number
  paid_minor: bigint
}
type ClubMonthRow = {
  month: string
  paid_minor: bigint
  sessions: number
  matches: number
  cost_per_session_minor: number
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Sums travel as bigint; centavo totals stay well inside a safe integer. */
function minor(value: bigint | number): number {
  const n = Number(value)
  if (!Number.isSafeInteger(n)) throw new Error('Sales total is not a safe integer')
  return n
}

const planOf = (plan: string): LicensePlan => (plan === 'yearly' ? 'Yearly' : 'Monthly')

/** `?period=` of A-SALES: missing means the default (30 days); anything else unknown is invalid. */
export function parseSalesPeriod(value: string | null): SalesPeriod {
  if (value == null || value === '') return DEFAULT_SALES_PERIOD
  if (!(SALES_PERIODS as readonly string[]).includes(value)) throw new ServiceError('invalid')
  return value as SalesPeriod
}

function metricOf<V>(
  rows: BucketRow[],
  current: (row: BucketRow) => number,
  previous: (row: BucketRow) => number,
  comparable: boolean,
  wrap: (n: number) => V,
): SalesMetric<V> {
  const value = rows.reduce((total, row) => total + current(row), 0)
  const before = rows.reduce((total, row) => total + previous(row), 0)
  return {
    value: wrap(value),
    previous: wrap(before),
    change: salesChange(value, before, comparable),
    buckets: rows.map((row) => ({ start: row.bucket_start, value: wrap(current(row)) })),
  }
}

/** A-SALES for one period, for today in Manila. */
export async function readPlatformSales(
  context: AdminContext,
  period: SalesPeriod,
  today: string = manilaToday(),
): Promise<PlatformSalesReport> {
  void context
  const [buckets, plans, payments, clubs] = await Promise.all([
    prisma.$queryRaw<BucketRow[]>`
      SELECT * FROM public.rotra_sales_platform_buckets(${period}, ${today}::date)`,
    prisma.$queryRaw<PlanRow[]>`
      SELECT * FROM public.rotra_sales_revenue_by_plan(${period}, ${today}::date)`,
    prisma.$queryRaw<PaymentRow[]>`
      SELECT * FROM public.rotra_sales_recent_payments(
        ${period}, ${today}::date, ${SALES_LIST_LIMIT}::integer)`,
    prisma.$queryRaw<ClubActivityRow[]>`
      SELECT * FROM public.rotra_sales_most_active_clubs(
        ${period}, ${today}::date, ${SALES_LIST_LIMIT}::integer)`,
  ])
  const first = buckets[0]
  if (!first) throw new Error('Sales period returned no bars')
  // The comparison needs the whole earlier period to start on or after the first licensed day.
  const comparable = first.previous_start >= (first.first_licensed_on ?? today)
  return {
    period,
    bucketUnit: salesBucketUnit(period),
    today,
    from: first.bucket_start,
    to: today,
    revenue: metricOf(
      buckets,
      (row) => minor(row.revenue_minor),
      (row) => minor(row.previous_revenue_minor),
      comparable,
      peso,
    ),
    sessionsStarted: metricOf(
      buckets,
      (row) => row.sessions,
      (row) => row.previous_sessions,
      comparable,
      (n) => n,
    ),
    matchesPlayed: metricOf(
      buckets,
      (row) => row.matches,
      (row) => row.previous_matches,
      comparable,
      (n) => n,
    ),
    revenueByPlan: plans.map((row) => ({
      plan: planOf(row.plan),
      total: peso(minor(row.total_minor)),
      payments: row.payments,
    })),
    recentPayments: payments.map((row) => ({
      termId: row.term_id,
      clubId: row.club_id,
      clubName: row.club_name,
      plan: planOf(row.plan),
      paidOn: row.paid_on,
      amount: peso(row.amount_minor),
    })),
    mostActiveClubs: clubs.map((row) => ({
      clubId: row.club_id,
      clubName: row.club_name,
      sessions: row.sessions,
      matches: row.matches,
      paid: peso(minor(row.paid_minor)),
    })),
  }
}

/** Paid divided by sessions, rounded to the centavo; null with no sessions (as sales.rules). */
const perSession = (paidMinor: number, sessions: number): SalesMoney | null =>
  sessions ? peso(Math.round(paidMinor / sessions)) : null

/**
 * A-CLUB-SALES: the last six months for one club, oldest first, null when no club has this id.
 * The estimate uses the current Admin cost per session for every month.
 */
export async function readClubSales(
  context: AdminContext,
  clubId: string,
  today: string = manilaToday(),
): Promise<ClubSalesReport | null> {
  void context
  if (!UUID.test(clubId)) return null
  const club = await prisma.club.findUnique({
    where: { id: clubId },
    select: { licensePricing: true, licenseMonthlyMinor: true },
  })
  if (!club) return null
  const rows = await prisma.$queryRaw<ClubMonthRow[]>`
    SELECT * FROM public.rotra_sales_club_months(
      ${clubId}::uuid, ${today}::date, ${CLUB_SALES_MONTHS}::integer)`
  if (rows.length !== CLUB_SALES_MONTHS) throw new Error('Admin settings row is missing')
  const cost = rows[0]?.cost_per_session_minor ?? 0
  const months: ClubSalesMonth[] = rows.map((row) => {
    const paid = minor(row.paid_minor)
    const estimated = row.sessions * cost
    return {
      month: row.month,
      paid: peso(paid),
      sessions: row.sessions,
      matches: row.matches,
      paidPerSession: paid ? perSession(paid, row.sessions) : null,
      estimatedCost: peso(estimated),
      leftOver: peso(paid - estimated),
    }
  })
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
    pricing: club.licensePricing,
    monthlyListPrice: club.licensePricing === 'free' ? null : peso(club.licenseMonthlyMinor ?? 0),
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
