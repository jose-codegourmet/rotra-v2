'use client'

import { formatPeso } from '@rotra/schema/money'
import { Card } from '@rotra/ui/card'
import { DataTable } from '@rotra/ui/data-table'
import { KeyValueList } from '@rotra/ui/key-value-list'
import { createColumnHelper } from '@tanstack/react-table'
import { type ReactNode, useId } from 'react'

export type PlanRevenueItem = {
  id: string
  /** Monthly or Yearly */
  plan: string
  /** Money clubs paid on this plan in the period, in centavos */
  amountMinor: number
  paymentCount: number
}

export type RecentPaymentItem = {
  id: string
  clubId: string
  clubName: string
  plan: string
  /** The date you recorded the payment, already formatted ("Nov 2, 2026") */
  paidOn: string
  /** Centavos; 0 reads "Free" */
  amountMinor: number
}

export type ActiveClubItem = {
  id: string
  clubName: string
  sessions: number
  matches: number
  paidMinor: number
}

type Shared = {
  /** Muted line under the list */
  note?: ReactNode
  /** Shown instead of the list when there are no items, e.g. "No payments were recorded last 30 days." */
  emptyText: string
  /** The club name opens the club; plain text when omitted */
  onOpenClub?: (clubId: string) => void
}

export type SalesBreakdownListProps = Shared &
  (
    | { kind: 'plans'; items: PlanRevenueItem[] }
    | { kind: 'payments'; items: RecentPaymentItem[] }
    | { kind: 'clubs'; items: ActiveClubItem[] }
  )

const TITLES = {
  plans: 'Revenue by plan',
  payments: 'Recent payments',
  clubs: 'Most active clubs',
} as const

const amountText = (minor: number) => (minor === 0 ? 'Free' : formatPeso(minor))

function ClubName({
  id,
  name,
  onOpenClub,
}: {
  id: string
  name: string
  onOpenClub?: (clubId: string) => void
}) {
  if (!onOpenClub) return <b>{name}</b>
  return (
    <button
      type="button"
      onClick={() => onOpenClub(id)}
      className="cursor-pointer border-0 bg-transparent p-0 text-left font-bold [overflow-wrap:anywhere] text-fg hover:underline hover:underline-offset-[3px]"
    >
      {name}
    </button>
  )
}

const clubColumn = createColumnHelper<ActiveClubItem>()

/**
 * The Sales page's three lists: Revenue by plan (kind "plans"), Recent payments ("payments") and
 * Most active clubs ("clubs", a table that becomes cards on phones).
 */
export function SalesBreakdownList(props: SalesBreakdownListProps) {
  const headingId = useId()
  const { note, emptyText, onOpenClub } = props

  let body: ReactNode
  if (props.items.length === 0) {
    body = <p className="m-0 text-[13px] text-fg2">{emptyText}</p>
  } else if (props.kind === 'plans') {
    body = (
      <KeyValueList
        items={props.items.map((item) => ({
          id: item.id,
          label: item.plan,
          value: (
            <>
              {formatPeso(item.amountMinor)}{' '}
              <span className="text-[13px] text-fg2">
                · {item.paymentCount} payment{item.paymentCount === 1 ? '' : 's'}
              </span>
            </>
          ),
        }))}
      />
    )
  } else if (props.kind === 'payments') {
    body = (
      <ul className="m-0 flex list-none flex-col p-0">
        {props.items.map((item) => (
          <li
            key={item.id}
            className="flex items-baseline justify-between gap-2.5 border-t border-border py-2 first:border-t-0"
          >
            <div className="min-w-0">
              <ClubName id={item.clubId} name={item.clubName} onOpenClub={onOpenClub} />
              <span className="text-[13px] text-fg2">
                {' '}
                · {item.plan} · {item.paidOn}
              </span>
            </div>
            <b className="tabular-nums">{amountText(item.amountMinor)}</b>
          </li>
        ))}
      </ul>
    )
  } else {
    body = (
      <DataTable
        aria-label="Most active clubs"
        data={props.items}
        getRowId={(row) => row.id}
        columns={[
          clubColumn.accessor('clubName', {
            header: 'Club',
            enableSorting: false,
            meta: { lead: true },
            cell: (info) => (
              <ClubName id={info.row.original.id} name={info.getValue()} onOpenClub={onOpenClub} />
            ),
          }),
          clubColumn.accessor('sessions', {
            header: 'Sessions',
            enableSorting: false,
            meta: { align: 'right' },
          }),
          clubColumn.accessor('matches', {
            header: 'Matches',
            enableSorting: false,
            meta: { align: 'right' },
          }),
          clubColumn.accessor('paidMinor', {
            header: 'Paid',
            enableSorting: false,
            meta: { align: 'right' },
            cell: (info) => formatPeso(info.getValue()),
          }),
        ]}
      />
    )
  }

  return (
    <Card asChild>
      <section aria-labelledby={headingId} className="flex min-w-0 flex-col gap-3">
        <h2 id={headingId}>{TITLES[props.kind]}</h2>
        {body}
        {note ? <p className="m-0 text-[13px] text-fg2">{note}</p> : null}
      </section>
    </Card>
  )
}
