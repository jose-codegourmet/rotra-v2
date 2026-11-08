import { describe, expect, it } from 'vitest'
import { clubSalesReport, peso, platformSalesReport, salesChange } from './sales.rules'
import type { SalesInput } from './sales.types'

const TODAY = '2026-11-08'

const input: SalesInput = {
  today: TODAY,
  clubs: [
    { id: 'a', name: 'Alpha Club', pricing: 'paid', monthlyListMinor: 150000 },
    { id: 'b', name: 'Beta Club', pricing: 'free', monthlyListMinor: 100000 },
  ],
  payments: [
    // Alpha: this month, last month, and a yearly payment three months ago.
    {
      termId: 'T3',
      clubId: 'a',
      plan: 'Monthly',
      paidOn: '2026-11-03',
      amountMinor: 150000,
      startsAt: '2026-11-03',
    },
    {
      termId: 'T2',
      clubId: 'a',
      plan: 'Monthly',
      paidOn: '2026-10-03',
      amountMinor: 150000,
      startsAt: '2026-10-03',
    },
    {
      termId: 'T1',
      clubId: 'a',
      plan: 'Yearly',
      paidOn: '2026-08-01',
      amountMinor: 1500000,
      startsAt: '2024-01-01',
    },
    // Beta is a tester club: recorded at ₱0.
    {
      termId: 'T4',
      clubId: 'b',
      plan: 'Monthly',
      paidOn: '2026-11-01',
      amountMinor: 0,
      startsAt: '2026-11-01',
    },
  ],
  sessions: [
    { clubId: 'a', startedOn: '2026-11-08', matches: 10 },
    { clubId: 'a', startedOn: '2026-11-02', matches: 12 },
    { clubId: 'a', startedOn: '2026-10-30', matches: 9 },
    { clubId: 'b', startedOn: '2026-11-05', matches: 20 },
  ],
}

describe('salesChange', () => {
  it('follows the prototype chip', () => {
    expect(salesChange(5, 5, false)).toEqual({ kind: 'no-history' })
    expect(salesChange(0, 0, true)).toEqual({ kind: 'no-change' })
    expect(salesChange(3, 0, true)).toEqual({ kind: 'new' })
    expect(salesChange(150, 100, true)).toEqual({ kind: 'change', percent: 50 })
    expect(salesChange(50, 100, true)).toEqual({ kind: 'change', percent: -50 })
    expect(salesChange(100, 100, true)).toEqual({ kind: 'change', percent: 0 })
  })
})

describe('platformSalesReport', () => {
  it('counts payments on the day paid, in integer centavos', () => {
    const report = platformSalesReport(input, '7d')
    expect(report.from).toBe('2026-11-02')
    expect(report.revenue.value).toEqual(peso(150000))
    expect(report.revenue.buckets).toHaveLength(7)
    expect(report.revenue.buckets[1]).toEqual({ start: '2026-11-03', value: peso(150000) })
    // Beta's Nov 1 term is the day before the period.
    expect(report.recentPayments.map((p) => p.termId)).toEqual(['T3'])
  })

  it('counts free clubs in sessions and matches with ₱0 revenue', () => {
    const report = platformSalesReport(input, '7d')
    expect(report.sessionsStarted.value).toBe(3)
    expect(report.matchesPlayed.value).toBe(42)
    expect(report.mostActiveClubs).toEqual([
      { clubId: 'a', clubName: 'Alpha Club', sessions: 2, matches: 22, paid: peso(150000) },
      { clubId: 'b', clubName: 'Beta Club', sessions: 1, matches: 20, paid: peso(0) },
    ])
  })

  it('compares with the period before on the same bars', () => {
    const report = platformSalesReport(input, '30d')
    // Oct 10 – Nov 8 against Sep 10 – Oct 9.
    expect(report.revenue.value).toEqual(peso(150000))
    expect(report.revenue.previous).toEqual(peso(150000))
    expect(report.revenue.change).toEqual({ kind: 'change', percent: 0 })
  })

  it('groups 12 months by the month paid and totals by plan', () => {
    const report = platformSalesReport(input, '12m')
    expect(report.bucketUnit).toBe('month')
    expect(report.from).toBe('2025-12-01')
    expect(report.revenue.value).toEqual(peso(1800000))
    expect(report.revenue.buckets.at(-4)).toEqual({ start: '2026-08-01', value: peso(1500000) })
    expect(report.revenueByPlan).toEqual([
      { plan: 'Monthly', total: peso(300000), payments: 3 },
      { plan: 'Yearly', total: peso(1500000), payments: 1 },
    ])
  })

  it('says there is not enough history when the earlier period starts before the first license', () => {
    const recent = { ...input, payments: input.payments.filter((p) => p.termId !== 'T1') }
    expect(platformSalesReport(recent, '30d').sessionsStarted.change).toEqual({
      kind: 'no-history',
    })
  })
})

describe('clubSalesReport', () => {
  it('estimates cost from the configured cost per session', () => {
    const report = clubSalesReport(input, 'a', peso(1500))
    expect(report?.months.map((m) => m.month)).toEqual([
      '2026-06',
      '2026-07',
      '2026-08',
      '2026-09',
      '2026-10',
      '2026-11',
    ])
    expect(report?.months.at(-1)).toEqual({
      month: '2026-11',
      paid: peso(150000),
      sessions: 2,
      matches: 22,
      paidPerSession: peso(75000),
      estimatedCost: peso(3000),
      leftOver: peso(147000),
    })
    expect(report?.totals.paid).toEqual(peso(1800000))
    expect(report?.totals.paidPerSession).toEqual(peso(600000))
    expect(report?.monthlyListPrice).toEqual(peso(150000))
  })

  it('shows a negative left over for a tester club', () => {
    const report = clubSalesReport(input, 'b', peso(1500))
    expect(report?.monthlyListPrice).toBeNull()
    expect(report?.totals.leftOver).toEqual(peso(-1500))
    expect(report?.months.at(-1)?.paidPerSession).toBeNull()
  })

  it('is null for an unknown club', () => {
    expect(clubSalesReport(input, 'missing', peso(1500))).toBeNull()
  })
})
