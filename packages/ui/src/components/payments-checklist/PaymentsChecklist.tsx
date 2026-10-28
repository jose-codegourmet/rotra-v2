'use client'

import { formatPeso } from '@rotra/schema/money'
import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
import { cn } from '@rotra/ui/cn'
import { PaymentCard, type PaymentPlayer } from '@rotra/ui/payments-checklist/payment-card'
import { SegmentedControl } from '@rotra/ui/segmented-control'
import { Notice } from '@rotra/ui/notice'

export type PaymentFilter = 'all' | 'unpaid' | 'paid'
export type PaymentsChecklistProps = {
  amountDue: number | null
  dueBasis: 'custom' | 'break_even'
  entranceFeeIncluded?: number
  totals: { paid: number; total: number; collected: number; stillDue: number | null; againstCosts: number | null; cost: number | null }
  filter: PaymentFilter
  players: PaymentPlayer[]
  onFilterChange: (filter: PaymentFilter) => void
  onTogglePaid: (id: string) => void
  onMarkAllPaid: () => void
  onSelectPlayer: (id: string) => void
  asSheet?: boolean
  disabled?: boolean
  saveError?: string
  className?: string
}
export function PaymentsChecklist({ amountDue, dueBasis, entranceFeeIncluded, totals, filter, players, onFilterChange, onTogglePaid, onMarkAllPaid, onSelectPlayer, asSheet, disabled, saveError, className }: PaymentsChecklistProps) {
  const rows = players.filter((p) => filter === 'all' || (filter === 'paid' ? !!p.paid : !p.paid))
  return <section className={cn('flex min-w-0 flex-col gap-4', !asSheet && 'rounded-lg border border-border bg-surface p-4 shadow-card', className)}>
    <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0 basis-full min-[600px]:basis-[360px] min-[600px]:flex-1"><h2 className="m-0 text-lg font-bold">Payments</h2>
      <p className="mt-1 mb-0 text-sm text-fg2">{amountDue === null ? 'No fee set for this session.' : `${formatPeso(amountDue)} per player (${dueBasis === 'custom' ? 'custom amount' : 'break-even share'}${entranceFeeIncluded ? `, includes the ${formatPeso(entranceFeeIncluded)} entrance fee` : ''}).`} Tick players as they pay. ROTRA only records it; money is collected outside the app.</p></div>
      {totals.paid < totals.total ? <Button size="sm" disabled={disabled} onClick={onMarkAllPaid}>Mark all paid</Button> : null}
    </div>
    {saveError ? <Notice tone="error">{saveError}</Notice> : null}
    <div className="grid grid-cols-2 gap-3 min-[800px]:grid-cols-4">
      {[
        { label: 'Paid', value: `${totals.paid}/${totals.total}` },
        { label: 'Collected', value: formatPeso(totals.collected) },
        { label: 'Still due', value: totals.stillDue === null ? '—' : formatPeso(totals.stillDue) },
        { label: 'Against costs', value: totals.againstCosts === null ? '—' : `${totals.againstCosts < 0 ? '−' : '+'}${formatPeso(Math.abs(totals.againstCosts))}`, color: totals.againstCosts === null ? undefined : totals.againstCosts < 0 ? 'text-warn' : 'text-accent', hint: totals.cost === null ? undefined : `of ${formatPeso(totals.cost)} cost` },
      ].map((tile) => <Card key={tile.label} className="flex flex-col gap-1 p-3"><span className="text-xs text-fg2">{tile.label}</span><b className={cn('break-words text-[26px] font-extrabold tabular-nums', tile.color)}>{tile.value}</b>{tile.hint ? <span className="text-xs text-fg2">{tile.hint}</span> : null}</Card>)}
    </div>
    <SegmentedControl aria-label="Show payments" value={filter} onChange={(value) => onFilterChange(value as PaymentFilter)} options={[{ value: 'all', label: `Everyone · ${totals.total}` }, { value: 'unpaid', label: `Not paid · ${totals.total - totals.paid}` }, { value: 'paid', label: `Paid · ${totals.paid}` }]} />
    {rows.length ? <div className="grid grid-cols-2 gap-2.5 min-[500px]:grid-cols-[repeat(auto-fit,minmax(150px,1fr))]">{rows.map((p) => <PaymentCard key={p.clubPlayerId} player={p} amountDue={amountDue} onTogglePaid={() => onTogglePaid(p.clubPlayerId)} onSelectPlayer={() => onSelectPlayer(p.clubPlayerId)} disabled={disabled} />)}</div> : <p className="m-0 text-sm text-fg2">{filter === 'unpaid' ? 'Everyone has paid.' : filter === 'paid' ? 'Nobody has paid yet.' : 'No players yet.'}</p>}
  </section>
}
