'use client'

import type { RefundListRow } from '@rotra/data/session-payment/refund-rules'
import { formatPeso } from '@rotra/schema/money'
import { Avatar } from '@rotra/ui/avatar'
import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
import { Chip } from '@rotra/ui/chip'

export type RefundListProps = {
  /** From `refundList()`: paid and partially paid players, sorted by name */
  rows: (RefundListRow & { photoUrl?: string })[]
  /** Σ still to hand back and how many players are left */
  leftMinor: number
  leftCount: number
  /** Σ refunds recorded */
  refundedMinor: number
  /** "yesterday 9:00 PM" for a recorded refund */
  whenLabel: (at: number) => string
  /** Record refund: the caller opens RefundConfirmSheet (variant session) for this row */
  onRecord: (entryId: string) => void
  /** Offline or a command running: Record refund is disabled */
  disabled?: boolean
  /** Why Record refund is disabled (offline) */
  disabledReason?: string
  className?: string
}

/**
 * **Refund everyone who paid** on a cancelled session's record (#1014, owner decision 2026-11-22;
 * the prototype's refundCard). Every roster player who paid cash, Paid or Partial, with the whole
 * cash to hand back (never a waived amount) and **Record refund**, or the refund already recorded.
 * ROTRA moves no money. Hidden by the caller when nobody paid. Presentational.
 */
export function RefundList({
  rows,
  leftMinor,
  leftCount,
  refundedMinor,
  whenLabel,
  onRecord,
  disabled = false,
  disabledReason,
  className,
}: RefundListProps) {
  return (
    <Card className={className}>
      <section aria-labelledby="refund-list-title" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <h2 id="refund-list-title" className="m-0">
              Refund everyone who paid
            </h2>
            <p className="m-0 text-[13px] text-fg2">
              ROTRA doesn't move money. Hand each amount back outside ROTRA, then record it here.
              Full refunds of the cash collected; waived amounts are not cash.
            </p>
          </div>
          <div className="flex flex-col items-end gap-0.5 text-right">
            <b className="tabular-nums">
              {leftCount
                ? `${formatPeso(leftMinor)} to refund · ${leftCount}`
                : 'All refunds recorded'}
            </b>
            {refundedMinor ? (
              <span className="text-[13px] text-fg2">{formatPeso(refundedMinor)} refunded</span>
            ) : null}
          </div>
        </div>
        <ul className="m-0 flex list-none flex-col p-0">
          {rows.map((row) => (
            <li
              key={row.entryId}
              className="flex min-w-0 items-center gap-3 border-t border-border py-2.5 first:border-t-0"
            >
              <Avatar name={row.name} src={row.photoUrl} size={36} />
              <div className="flex min-w-0 flex-1 flex-col">
                <b className="[overflow-wrap:anywhere]">{row.name}</b>
                <span className="text-[13px] text-fg2">
                  {row.status === 'partial' ? 'Partial' : 'Paid'} · {formatPeso(row.amountMinor)}{' '}
                  collected
                </span>
              </div>
              {row.recorded ? (
                <Chip tone="accent">
                  Refunded {formatPeso(row.amountMinor)}
                  {row.refundedAt !== null ? ` · ${whenLabel(row.refundedAt)}` : ''}
                </Chip>
              ) : (
                <Button
                  size="sm"
                  disabled={disabled}
                  title={disabled ? disabledReason : undefined}
                  aria-haspopup="dialog"
                  aria-label={`Record refund of ${formatPeso(row.amountMinor)} to ${row.name}`}
                  onClick={() => onRecord(row.entryId)}
                >
                  Record refund · {formatPeso(row.amountMinor)}
                </Button>
              )}
            </li>
          ))}
        </ul>
      </section>
    </Card>
  )
}
