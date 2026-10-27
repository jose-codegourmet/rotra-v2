'use client'

import type { ClubLicenseTerm } from '@rotra/data/license/types'
import { formatPeso } from '@rotra/schema/money'
import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
import { Chip } from '@rotra/ui/chip'
import { DataTable } from '@rotra/ui/data-table'
import { createColumnHelper } from '@tanstack/react-table'
import { useId } from 'react'

export type LicensePanelProps = {
  status: 'active' | 'expired' | 'unverified'
  plan: 'Monthly' | 'Yearly'
  /** ISO dates "2026-04-01" */
  activeSince: string
  activeUntil: string
  daysLeft: number
  /** Newest first */
  payments: ClubLicenseTerm[]
  onExport: () => void
  /** Prices are placeholders: shows the sample-amounts note */
  sampleAmounts?: boolean
  className?: string
}

/** "Apr 1, 2026" from an ISO date, like the prototype's fmtYmd. */
export function formatIsoDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y ?? 0, (m ?? 1) - 1, d ?? 1).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const STATUS_CHIP = {
  active: { tone: 'accent', label: 'Active' },
  expired: { tone: 'error', label: 'License expired' },
  unverified: { tone: 'warn', label: 'Unable to verify access' },
} as const

const column = createColumnHelper<ClubLicenseTerm>()
const columns = [
  column.accessor('paidOn', {
    header: 'Paid',
    cell: (info) => (info.getValue() ? formatIsoDate(info.getValue() ?? '') : '—'),
    meta: { lead: true, nowrap: true },
  }),
  column.accessor('plan', { header: 'Plan' }),
  column.display({
    id: 'covers',
    header: 'Covers',
    cell: ({ row }) => (
      <span className="text-[13px]">
        {formatIsoDate(row.original.startsAt)} – {formatIsoDate(row.original.endsAt)}
      </span>
    ),
  }),
  column.accessor('amountMinor', {
    header: 'Amount',
    cell: (info) => formatPeso(info.getValue()),
    meta: { align: 'right', nowrap: true },
  }),
  column.accessor('paymentReference', {
    header: 'Reference',
    cell: (info) => <span className="font-mono text-[13px]">{info.getValue()}</span>,
  }),
]

/** Club settings › License and payments: the license card with four tiles, then the payment history. */
export function LicensePanel({
  status,
  plan,
  activeSince,
  activeUntil,
  daysLeft,
  payments,
  onExport,
  sampleAmounts,
  className,
}: LicensePanelProps) {
  const id = useId()
  const chip = STATUS_CHIP[status]
  const tiles: [string, string, boolean][] = [
    ['Plan', plan, true],
    ['Active since', formatIsoDate(activeSince), false],
    ['Active until', formatIsoDate(activeUntil), false],
    ['Days left', String(daysLeft), true],
  ]
  return (
    <div className={className}>
      <div className="flex flex-col gap-4">
        <Card asChild>
          <section aria-labelledby={`${id}-license`} className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id={`${id}-license`}>License</h2>
              <Chip tone={chip.tone}>{chip.label}</Chip>
            </div>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,140px),1fr))] gap-3">
              {tiles.map(([label, value, big]) => (
                <Card key={label} className="flex flex-col gap-0.5">
                  <span className="text-xs font-semibold tracking-[0.5px] text-fg2 uppercase">
                    {label}
                  </span>
                  <b className={big ? 'text-[26px] font-extrabold tabular-nums' : 'tabular-nums'}>
                    {value}
                  </b>
                </Card>
              ))}
            </div>
            <p className="m-0 text-[13px] text-fg2">
              Licenses are monthly or yearly. The ROTRA platform owner activates and renews them by
              hand after you pay outside ROTRA, so contact them to renew or change plans. If it
              lapses, a session already running can still be finished and synced.
            </p>
          </section>
        </Card>
        <Card asChild>
          <section aria-labelledby={`${id}-payments`} className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 id={`${id}-payments`}>Payment history</h2>
                <p className="m-0 text-[13px] text-fg2">
                  Recorded by the platform owner each time a license is activated.
                </p>
              </div>
              <Button size="sm" onClick={onExport}>
                Export CSV
              </Button>
            </div>
            <DataTable
              aria-label="License payments"
              columns={columns}
              data={payments}
              getRowId={(row) => row.id}
              empty={
                <p className="m-0 py-4 text-center text-sm text-fg2">No payments recorded yet.</p>
              }
            />
            {sampleAmounts ? (
              <p className="m-0 text-[13px] text-fg2">
                Sample amounts. License prices haven't been decided yet.
              </p>
            ) : null}
          </section>
        </Card>
      </div>
    </div>
  )
}
