'use client'

import { formatPeso } from '@rotra/schema/money'
import { Card } from '@rotra/ui/card'
import { ConfirmSheet } from '@rotra/ui/confirm-sheet'
import { Notice } from '@rotra/ui/notice'
import type { ReactNode } from 'react'

export type RefundConfirmSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /**
   * `transfer`: D-REJECT-REFUND, Requests › Slot transfers › Reject and refund.
   * `session`: D-SESSION-REFUND, a cancelled record's Record refund.
   */
  variant: 'transfer' | 'session'
  /** Who is handed the money back: the transfer's sender, or the cancelled session's player */
  name: string
  /** The full refund: the whole cash collected for the slot, never a waiver */
  amountMinor: number
  /** `transfer`: the waiver recorded on the slot by earlier transfers, named as not refunded */
  waivedMinor?: number
  /** `transfer`: who asked to receive the slot */
  recipientName?: string
  /** `transfer`: the first waitlisted player with a level, who gets the freed slot; null for none */
  nextWaiterName?: string | null
  onConfirm: () => void
  isPending?: boolean
  error?: ReactNode
}

/**
 * The manual full refund confirmations (#1014, the prototype's rejectRefund and sessionRefund
 * sheets). Both state the amount to hand back and that ROTRA only records the refund (it moves no
 * money). Reject and refund also says the sender's registration is cancelled and who takes the
 * freed slot (FIFO). Presentational: the caller owns the mutation.
 */
export function RefundConfirmSheet({
  open,
  onOpenChange,
  variant,
  name,
  amountMinor,
  waivedMinor = 0,
  recipientName,
  nextWaiterName = null,
  onConfirm,
  isPending = false,
  error,
}: RefundConfirmSheetProps) {
  const amount = formatPeso(amountMinor)
  const handBack = `Hand ${amount} back to ${name} outside ROTRA. ROTRA only records the refund; it moves no money.`
  if (variant === 'session')
    return (
      <ConfirmSheet
        open={open}
        onOpenChange={onOpenChange}
        title="Record refund?"
        summary={
          <p className="m-0">
            <b>{name}</b> · {amount}
          </p>
        }
        consequence={`Hand ${amount} back to ${name} outside ROTRA, then record it here. ROTRA only records the refund; it moves no money.`}
        note="Full refund of the cash collected. The payment and the refund both stay in the record."
        confirmLabel="Record refund"
        onConfirm={onConfirm}
        isPending={isPending}
        error={error}
      />
    )
  return (
    <ConfirmSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Reject and refund?"
      summary={
        <div className="flex flex-col gap-3">
          <p className="m-0">
            <b>{name}</b> asked to transfer their slot to {recipientName ?? 'another player'}.
          </p>
          <Card className="flex flex-col gap-1">
            <span className="text-xs font-semibold tracking-[0.5px] text-fg2 uppercase">
              Refund to hand back
            </span>
            <b className="text-2xl tabular-nums">{amount}</b>
            <span className="text-[13px] text-fg2">
              The whole amount collected for this slot
              {waivedMinor > 0
                ? ` (the ${formatPeso(waivedMinor)} waived is not cash and is not refunded)`
                : ''}
              . Full refunds only.
            </span>
          </Card>
        </div>
      }
      consequence={handBack}
      note={`${name}'s registration is cancelled and the slot opens. ${
        nextWaiterName
          ? `${nextWaiterName}, first on the waitlist, gets it.`
          : 'Nobody is waiting, so the slot stays open.'
      } ${recipientName ?? 'The recipient'} doesn't get the slot. The payment and the refund both stay in the record.`}
      notice={<Notice tone="error">This can't be undone.</Notice>}
      confirmLabel="Reject and refund"
      destructive
      onConfirm={onConfirm}
      isPending={isPending}
      error={error}
    />
  )
}
