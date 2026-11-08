'use client'

import { formatLicenseDate } from '@rotra/data/license/rules'
import type {
  SalesChange as DataSalesChange,
  SalesMetric,
  SalesMoney,
  SalesPeriod,
} from '@rotra/data/sales/types'
import { usePlatformSales } from '@rotra/data/sales/usePlatformSales'
import { formatPeso } from '@rotra/schema/money'
import type { BarChartBar } from '@rotra/ui/bar-chart'
import { Card } from '@rotra/ui/card'
import { ErrorState } from '@rotra/ui/error-state'
import { PageHeader } from '@rotra/ui/page-header'
import { SalesBreakdownList } from '@rotra/ui/sales-breakdown-list'
import { type SalesChange, SalesStatCard } from '@rotra/ui/sales-stat-card'
import { SegmentedControl } from '@rotra/ui/segmented-control'
import { Skeleton } from '@rotra/ui/skeleton'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useDenyOnPermissionError } from '../../../_components/admin-workspace-shell/AdminWorkspaceShell'

/** Period switch copy as rotra-admin.html SALES_PERIODS; the lowercase form reads in the notes. */
const PERIODS: { value: SalesPeriod; label: string }[] = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '12m', label: 'Last 12 months' },
]

const count = (value: number) => value.toLocaleString('en-PH')

function uiChange(change: DataSalesChange): SalesChange {
  switch (change.kind) {
    case 'no-history':
      return { kind: 'no-history' }
    case 'new':
      return { kind: 'new' }
    case 'no-change':
      return { kind: 'same' }
    case 'change':
      if (change.percent > 0) return { kind: 'up', percent: change.percent }
      if (change.percent < 0) return { kind: 'down', percent: Math.abs(change.percent) }
      return { kind: 'same' }
  }
}

function bars<V>(metric: SalesMetric<V>, toNumber: (v: V) => number, text: (v: V) => string) {
  return metric.buckets.map(
    (bucket): BarChartBar => ({
      id: bucket.start,
      value: toNumber(bucket.value),
      valueLabel: text(bucket.value),
      title: `${formatLicenseDate(bucket.start)}: ${text(bucket.value)}`,
    }),
  )
}

const minor = (money: SalesMoney) => money.amountMinor

/**
 * A-SALES: revenue, sessions started and matches played for the chosen period, with the Revenue by
 * plan, Recent payments and Most active clubs lists (rotra-admin.html viewSales).
 */
export function PlatformSales() {
  const router = useRouter()
  const [period, setPeriod] = useState<SalesPeriod>('30d')
  const sales = usePlatformSales(period)
  const report = sales.data
  const denied = useDenyOnPermissionError(sales.error)
  if (denied) return null

  const label = (PERIODS.find((p) => p.value === period)?.label ?? '').toLowerCase()
  const unit = report?.bucketUnit === 'month' ? 'month' : 'day'
  const openClub = (clubId: string) => router.push(`/clubs/${clubId}`)

  return (
    <>
      <PageHeader
        title="Sales"
        description="License revenue, sessions started and matches played, across every club"
      />
      <SegmentedControl
        aria-label="Period"
        value={period}
        onChange={(value) => setPeriod(value as SalesPeriod)}
        options={PERIODS}
      />
      {sales.isError && !report ? (
        <ErrorState
          title="Couldn't load sales."
          onRetry={() => void sales.refetch()}
          retrying={sales.isFetching}
          retryLabel="Retry"
        >
          Check your connection, then try again.
        </ErrorState>
      ) : !report ? (
        <>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] gap-3">
            {Array.from({ length: 3 }, (_, card) => (
              <Card key={`skeleton-${card}`} aria-busy className="flex flex-col gap-3">
                <Skeleton label={card === 0 ? 'Loading sales' : undefined} className="w-24" />
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-12 w-full" />
              </Card>
            ))}
          </div>
          <Card aria-busy className="flex flex-col gap-3">
            <Skeleton className="w-40" />
            <Skeleton className="w-2/3" />
            <Skeleton className="w-1/2" />
          </Card>
        </>
      ) : (
        <>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] gap-3">
            <SalesStatCard
              label="Revenue"
              value={formatPeso(report.revenue.value.amountMinor)}
              change={uiChange(report.revenue.change)}
              bars={bars(report.revenue, minor, (v) => formatPeso(v.amountMinor))}
              chartLabel={`Revenue per ${unit}`}
            />
            <SalesStatCard
              label="Sessions started"
              value={count(report.sessionsStarted.value)}
              change={uiChange(report.sessionsStarted.change)}
              bars={bars(report.sessionsStarted, (v) => v, count)}
              chartLabel={`Sessions started per ${unit}`}
            />
            <SalesStatCard
              label="Matches played"
              value={count(report.matchesPlayed.value)}
              change={uiChange(report.matchesPlayed.change)}
              bars={bars(report.matchesPlayed, (v) => v, count)}
              chartLabel={`Matches played per ${unit}`}
            />
          </div>
          <div className="grid items-start gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr))]">
            <SalesBreakdownList
              kind="plans"
              items={report.revenueByPlan.map((row) => ({
                id: row.plan,
                plan: row.plan,
                amountMinor: row.total.amountMinor,
                paymentCount: row.payments,
              }))}
              emptyText={`No payments were recorded ${label}.`}
              note={`Money clubs paid ${label}, as you recorded it when activating or renewing. ROTRA doesn't collect it.`}
            />
            <SalesBreakdownList
              kind="payments"
              items={report.recentPayments.map((row) => ({
                id: row.termId,
                clubId: row.clubId,
                clubName: row.clubName,
                plan: row.plan,
                paidOn: formatLicenseDate(row.paidOn),
                amountMinor: row.amount.amountMinor,
              }))}
              emptyText={`No payments were recorded ${label}.`}
              onOpenClub={openClub}
            />
          </div>
          <SalesBreakdownList
            kind="clubs"
            items={report.mostActiveClubs.map((row) => ({
              id: row.clubId,
              clubName: row.clubName,
              sessions: row.sessions,
              matches: row.matches,
              paidMinor: row.paid.amountMinor,
            }))}
            emptyText={`No sessions started ${label}.`}
            note="Revenue comes from the recorded license payments."
            onOpenClub={openClub}
          />
        </>
      )}
    </>
  )
}
