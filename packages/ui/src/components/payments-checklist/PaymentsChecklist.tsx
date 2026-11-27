'use client'

import { formatPeso } from '@rotra/schema/money'
import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
import { cn } from '@rotra/ui/cn'
import { Notice } from '@rotra/ui/notice'
import { PaymentCard, type PaymentPlayer } from '@rotra/ui/payments-checklist/payment-card'
import { SegmentedControl } from '@rotra/ui/segmented-control'

export type PaymentFilter = 'all' | 'unpaid' | 'paid' | 'free'
export type PaymentsChecklistProps = {
  amountDue: number | null
  dueBasis: 'custom' | 'break_even'
  entranceFeeIncluded?: number
  totals: {
    /** Fully covered: Paid + Reimburse */
    paid: number
    partial: number
    total: number
    /** Σ cash received and kept (net of manual refunds, #1014); never a waived amount */
    collected: number
    /** Σ waived on slots that came by transfer (#1013), a record and not cash; hint when above 0 */
    waived?: number
    /** Σ manual full refunds recorded (#1014), handed back outside ROTRA; hint when above 0 */
    refunded?: number
    stillDue: number | null
    /** Σ overpayments to return outside ROTRA; shown only when above 0 */
    toReimburse: number
    againstCosts: number | null
    cost: number | null
    /** Free players (D-2026-11-27-01), left out of `total`; the Free tab always shows */
    free?: number
  }
  filter: PaymentFilter
  players: PaymentPlayer[]
  onFilterChange: (filter: PaymentFilter) => void
  onTogglePaid: (id: string) => void
  onMarkAllPaid: () => void
  onSelectPlayer: (id: string) => void
  /** Card body tap: opens "Payment from <name>" (#479) */
  onEditAmount: (id: string) => void
  /** Card body tap on a slot that came by transfer (#1013): opens its Slot history */
  onOpenSlotHistory?: (id: string) => void
  /** Opens Share payment status (#1010); the button is hidden when omitted */
  onShareStatus?: () => void
  asSheet?: boolean
  disabled?: boolean
  saveError?: string
  className?: string
}
export function PaymentsChecklist({
  amountDue,
  dueBasis,
  entranceFeeIncluded,
  totals,
  filter,
  players,
  onFilterChange,
  onTogglePaid,
  onMarkAllPaid,
  onSelectPlayer,
  onEditAmount,
  onOpenSlotHistory,
  onShareStatus,
  asSheet,
  disabled,
  saveError,
  className,
}: PaymentsChecklistProps) {
  // Paid = fully covered (Paid, Reimburse); Not paid = Unpaid or Partial (#479).
  // D-2026-11-27-01: free players owe nothing; they only show under Everyone and Free.
  const covered = (p: PaymentPlayer) =>
    !p.free && (p.status.kind === 'paid' || p.status.kind === 'reimburse')
  const free = totals.free ?? 0
  const shown: PaymentFilter = filter
  const rows = players
    .filter(
      (p) =>
        shown === 'all' ||
        (shown === 'free' ? p.free : shown === 'paid' ? covered(p) : !p.free && !covered(p)),
    )
    .sort((a, b) => Number(!!a.free) - Number(!!b.free))
  return (
    <section
      className={cn(
        'flex min-w-0 flex-col gap-4',
        !asSheet && 'rounded-lg border border-border bg-surface p-4 shadow-card',
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 basis-full min-[600px]:basis-[360px] min-[600px]:flex-1">
          <h2 className="m-0 text-lg font-bold">Payments</h2>
          <p className="mt-1 mb-0 text-sm text-fg2">
            {amountDue === null
              ? 'No fee set for this session.'
              : `${formatPeso(amountDue)} per player (${dueBasis === 'custom' ? 'custom amount' : 'break-even share'}${free ? `, ${free} free not counted` : ''}${entranceFeeIncluded ? `, includes the ${formatPeso(entranceFeeIncluded)} entrance fee` : ''}).`}{' '}
            Tick players as they pay, or tap a card to record a partial amount. ROTRA only records
            it; money is collected outside the app.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {onShareStatus && players.length ? (
            <Button size="sm" onClick={onShareStatus}>
              Share status
            </Button>
          ) : null}
          {players.some((p) => !p.paid && !p.free) ? (
            <Button size="sm" disabled={disabled} onClick={onMarkAllPaid}>
              Mark all paid
            </Button>
          ) : null}
        </div>
      </div>
      {saveError ? <Notice tone="error">{saveError}</Notice> : null}
      <div className="grid grid-cols-2 gap-3 min-[800px]:grid-cols-4">
        {[
          {
            label: 'Paid',
            value: `${totals.paid}/${totals.total}`,
            hint:
              [free ? `${free} free` : null, totals.partial ? `${totals.partial} partial` : null]
                .filter(Boolean)
                .join(' · ') || undefined,
          },
          {
            label: 'Collected',
            value: formatPeso(totals.collected),
            hint:
              [
                totals.toReimburse ? `${formatPeso(totals.toReimburse)} to reimburse` : null,
                totals.waived ? `${formatPeso(totals.waived)} waived (not cash)` : null,
                totals.refunded ? `${formatPeso(totals.refunded)} refunded` : null,
              ]
                .filter(Boolean)
                .join(' · ') || undefined,
          },
          {
            label: 'Still due',
            value: totals.stillDue === null ? '—' : formatPeso(totals.stillDue),
          },
          {
            label: 'Against costs',
            value:
              totals.againstCosts === null
                ? '—'
                : `${totals.againstCosts < 0 ? '−' : '+'}${formatPeso(Math.abs(totals.againstCosts))}`,
            color:
              totals.againstCosts === null
                ? undefined
                : totals.againstCosts < 0
                  ? 'text-warn'
                  : 'text-accent',
            hint: totals.cost === null ? undefined : `of ${formatPeso(totals.cost)} cost`,
          },
        ].map((tile) => (
          <Card key={tile.label} className="flex flex-col gap-1 p-3">
            <span className="text-xs text-fg2">{tile.label}</span>
            <b className={cn('break-words text-[26px] font-extrabold tabular-nums', tile.color)}>
              {tile.value}
            </b>
            {tile.hint ? <span className="text-xs text-fg2">{tile.hint}</span> : null}
          </Card>
        ))}
      </div>
      <SegmentedControl
        aria-label="Show payments"
        value={shown}
        onChange={(value) => onFilterChange(value as PaymentFilter)}
        options={[
          { value: 'all', label: `Everyone · ${totals.total}` },
          { value: 'unpaid', label: `Not paid · ${totals.total - totals.paid}` },
          { value: 'paid', label: `Paid · ${totals.paid}` },
          { value: 'free', label: `Free · ${free}` },
        ]}
      />
      {rows.length ? (
        <div className="grid grid-cols-2 gap-2.5 min-[500px]:grid-cols-[repeat(auto-fit,minmax(150px,1fr))]">
          {rows.map((p) => (
            <PaymentCard
              key={p.clubPlayerId}
              player={p}
              amountDue={amountDue}
              onTogglePaid={() => onTogglePaid(p.clubPlayerId)}
              onSelectPlayer={() => onSelectPlayer(p.clubPlayerId)}
              onEditAmount={() => onEditAmount(p.clubPlayerId)}
              onOpenHistory={() => onOpenSlotHistory?.(p.clubPlayerId)}
              disabled={disabled}
            />
          ))}
        </div>
      ) : (
        <p className="m-0 text-sm text-fg2">
          {shown === 'unpaid'
            ? 'Everyone has paid.'
            : shown === 'paid'
              ? 'Nobody has paid yet.'
              : shown === 'free'
                ? 'Nobody plays free. Tap a card, then Plays free.'
                : 'No players yet.'}
        </p>
      )}
    </section>
  )
}
