'use client'

import { formatPeso } from '@rotra/schema/money'
import { BarChart } from '@rotra/ui/bar-chart'
import { Card } from '@rotra/ui/card'
import { DataTable } from '@rotra/ui/data-table'
import { SalesStatCard } from '@rotra/ui/sales-stat-card'
import { createColumnHelper } from '@tanstack/react-table'
import { useId } from 'react'

export type ClubSalesMonth = {
  id: string
  /** "Jun 2026" */
  label: string
  /** License payments counted in the month they were paid, in centavos */
  paidMinor: number
  sessions: number
  matches: number
  /** Estimated running cost for the month, in centavos */
  estCostMinor: number
}

export type ClubSalesTableProps = {
  /** Oldest first */
  months: ClubSalesMonth[]
  /** The club pays ₱0 for licenses; changes the first summary note */
  free?: boolean
  /** The club's monthly list price in centavos (ignored when `free`) */
  monthlyListMinor: number
  /** Estimated cost per session in centavos, shown next to Paid per session */
  costPerSessionMinor: number
}

const WORDS = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
]

/** Whole pesos, with a real minus for a negative amount. */
const money = (minor: number) => (minor < 0 ? `−${formatPeso(-minor)}` : formatPeso(minor))
const num = (value: number) => value.toLocaleString('en-PH')
const dash = '—'

type Row = ClubSalesMonth & { perSessionMinor: number | null; leftOverMinor: number }

const column = createColumnHelper<Row>()
const numeric = { align: 'right' } as const

const columns = [
  column.accessor('label', {
    header: 'Month',
    enableSorting: false,
    meta: { lead: true },
  }),
  column.accessor('paidMinor', {
    header: 'Paid',
    enableSorting: false,
    meta: numeric,
    cell: (info) => (info.getValue() ? money(info.getValue()) : dash),
  }),
  column.accessor('sessions', { header: 'Sessions', enableSorting: false, meta: numeric }),
  column.accessor('matches', { header: 'Matches', enableSorting: false, meta: numeric }),
  column.accessor('perSessionMinor', {
    header: 'Paid per session',
    enableSorting: false,
    meta: numeric,
    cell: (info) => (info.getValue() === null ? dash : money(info.getValue() as number)),
  }),
  column.accessor('estCostMinor', {
    header: 'Est. cost',
    enableSorting: false,
    meta: numeric,
    cell: (info) => money(info.getValue()),
  }),
  column.accessor('leftOverMinor', {
    header: 'Left over',
    enableSorting: false,
    meta: numeric,
    cell: (info) => money(info.getValue()),
  }),
]

/**
 * Club detail › Sales: what one club pays ROTRA against how much it uses ROTRA. Three summary
 * numbers, a month-by-month table (cards on phones) and a bar chart of the amount paid each month.
 * Derived figures (totals, paid per session, left over) are plain sums and divisions of the props.
 */
export function ClubSalesTable({
  months,
  free,
  monthlyListMinor,
  costPerSessionMinor,
}: ClubSalesTableProps) {
  const headingId = useId()
  const total = months.reduce(
    (t, m) => ({
      paid: t.paid + m.paidMinor,
      sessions: t.sessions + m.sessions,
      matches: t.matches + m.matches,
      cost: t.cost + m.estCostMinor,
    }),
    { paid: 0, sessions: 0, matches: 0, cost: 0 },
  )
  const perSession = total.sessions ? total.paid / total.sessions : 0
  const margin = total.paid - total.cost
  const span = WORDS[months.length] ?? String(months.length)

  const rows: Row[] = months.map((m) => ({
    ...m,
    perSessionMinor: m.sessions && m.paidMinor ? m.paidMinor / m.sessions : null,
    leftOverMinor: m.paidMinor - m.estCostMinor,
  }))

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] gap-3">
        <SalesStatCard
          label={`Paid to ROTRA (${months.length} months)`}
          value={money(total.paid)}
          note={
            free ? 'Tester club, licenses at ₱0' : `${money(monthlyListMinor)} a month list price`
          }
        />
        <SalesStatCard
          label="Sessions started"
          value={num(total.sessions)}
          note={`${num(total.matches)} matches played`}
        />
        <SalesStatCard
          label="Paid per session"
          value={total.sessions ? money(perSession) : dash}
          note={`Against ${money(costPerSessionMinor)} estimated cost per session`}
        />
      </div>
      <Card asChild>
        <section aria-labelledby={headingId} className="flex min-w-0 flex-col gap-3">
          <h2 id={headingId}>Month by month</h2>
          <DataTable
            aria-label="Month by month"
            data={rows}
            columns={columns}
            getRowId={(row) => row.id}
          />
          <BarChart
            variant="labeled"
            aria-label="Paid each month"
            bars={months.map((m) => ({
              id: m.id,
              value: m.paidMinor,
              valueLabel: money(m.paidMinor),
              label: m.label.split(' ')[0],
              title: `${m.label}: ${money(m.paidMinor)}`,
            }))}
          />
          <p className="m-0 text-[13px] text-fg2">
            {margin >= 0
              ? `After the estimated running cost, this club leaves ${money(margin)} over ${span} months.`
              : `The estimated running cost is ${money(-margin)} more than this club paid in ${span} months.`}{' '}
            Payments are the license payments you recorded, counted in the month paid, so a yearly
            payment lands in one month. The cost per session ({money(costPerSessionMinor)}) is a
            placeholder until you set it.
          </p>
        </section>
      </Card>
    </div>
  )
}
