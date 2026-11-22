'use client'

import type { PaymentStatus } from '@rotra/data/session-payment/rules'
import type { SlotPaymentTransfer } from '@rotra/data/slot-transfer/slotTransfer.types'
import { formatPeso } from '@rotra/schema/money'
import { Avatar } from '@rotra/ui/avatar'
import { cn } from '@rotra/ui/cn'
import {
  PaymentStatusChip,
  paymentStatusLabel,
} from '@rotra/ui/payments-checklist/payment-status-chip'
import { Switch } from '@rotra/ui/switch'

export type PaymentPlayer = {
  clubPlayerId: string
  name: string
  picture?: string | null
  /** The recorded payment: cash received (centavos, own plus any carried by a transfer) and when */
  paid?: { amount: number; at: number }
  /** Amount received (and any waiver) against today's amount due (#479, #1013) */
  status: PaymentStatus
  /**
   * The slot came by approved slot transfer (#1013): Paid in Full through its history, so the
   * switch is locked and the card body opens the Slot history instead of the amount editor.
   */
  transfer?: SlotPaymentTransfer
}
export type PaymentCardProps = {
  player: PaymentPlayer
  amountDue: number | null
  onTogglePaid: () => void
  onSelectPlayer: () => void
  /** Opens "Payment from <name>" to record the amount received (#479) */
  onEditAmount: () => void
  /** Opens the Slot history of a slot that came by transfer (#1013) */
  onOpenHistory?: () => void
  disabled?: boolean
}

const timeOf = (at: number) =>
  new Date(at).toLocaleTimeString('en-PH', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Asia/Manila',
  })

/**
 * One roster player on the Payments list. The picture opens the profile and the switch is the quick
 * paid toggle; the card body below them is a separate button that opens the amount editor, so a
 * switch tap never opens it. A slot that came by transfer (#1013) is locked: the switch is
 * disabled and the body opens the Slot history (who paid, what was waived) instead.
 */
export function PaymentCard({
  player,
  amountDue,
  onTogglePaid,
  onSelectPlayer,
  onEditAmount,
  onOpenHistory,
  disabled,
}: PaymentCardProps) {
  const covered = player.status.kind === 'paid' || player.status.kind === 'reimburse'
  const transfer = player.transfer
  return (
    <article
      className={cn(
        'flex min-w-0 flex-col gap-1 rounded-lg border border-border bg-surface p-3 shadow-card',
        covered && 'border-accent bg-accent-subtle',
        player.status.kind === 'partial' && 'border-warn',
      )}
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <Avatar
          size={44}
          name={player.name}
          src={player.picture ?? undefined}
          onClick={onSelectPlayer}
          className={covered ? 'ring-2 ring-accent' : undefined}
        />
        <Switch
          aria-label={
            transfer ? `${player.name} paid through a slot transfer` : `${player.name} paid`
          }
          checked={!!player.paid}
          tone={player.status.kind === 'partial' ? 'warn' : 'accent'}
          onChange={onTogglePaid}
          disabled={disabled || !!transfer}
        />
      </div>
      <button
        type="button"
        aria-label={
          transfer
            ? `Slot history for ${player.name}: ${paymentStatusLabel(player.status)}`
            : `Payment from ${player.name}: ${paymentStatusLabel(player.status)}`
        }
        aria-haspopup={transfer ? 'dialog' : undefined}
        disabled={disabled}
        onClick={transfer ? onOpenHistory : onEditAmount}
        className="flex min-w-0 flex-1 cursor-pointer flex-col items-start gap-1 rounded-sm border-0 bg-transparent p-0 text-left text-fg disabled:cursor-not-allowed"
      >
        <b className="break-words text-sm">{player.name}</b>
        <PaymentStatusChip status={player.status} />
        {transfer ? (
          <>
            <span className={cn('text-xs text-fg2', covered && 'font-semibold text-accent')}>
              {`${formatPeso(player.paid?.amount ?? 0)} received · via transfer`}
            </span>
            {transfer.waivedMinor ? (
              <span className="text-xs text-fg2">{`${formatPeso(transfer.waivedMinor)} waived`}</span>
            ) : null}
          </>
        ) : player.paid ? (
          <span className={cn('text-xs text-fg2', covered && 'font-semibold text-accent')}>
            {`${formatPeso(player.paid.amount)} received · ${timeOf(player.paid.at)}`}
          </span>
        ) : amountDue !== null ? (
          <span className="text-xs text-fg2">{`${formatPeso(amountDue)} due`}</span>
        ) : null}
      </button>
    </article>
  )
}
