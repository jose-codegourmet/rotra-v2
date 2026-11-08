'use client'

import type { PaymentStatus } from '@rotra/data/session-payment/rules'
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
  /** The recorded payment: amount received (centavos) and when */
  paid?: { amount: number; at: number }
  /** Amount received against today's amount due (#479) */
  status: PaymentStatus
}
export type PaymentCardProps = {
  player: PaymentPlayer
  amountDue: number | null
  onTogglePaid: () => void
  onSelectPlayer: () => void
  /** Opens "Payment from <name>" to record the amount received (#479) */
  onEditAmount: () => void
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
 * switch tap never opens it.
 */
export function PaymentCard({
  player,
  amountDue,
  onTogglePaid,
  onSelectPlayer,
  onEditAmount,
  disabled,
}: PaymentCardProps) {
  const covered = player.status.kind === 'paid' || player.status.kind === 'reimburse'
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
          aria-label={`${player.name} paid`}
          checked={!!player.paid}
          tone={player.status.kind === 'partial' ? 'warn' : 'accent'}
          onChange={onTogglePaid}
          disabled={disabled}
        />
      </div>
      <button
        type="button"
        aria-label={`Payment from ${player.name}: ${paymentStatusLabel(player.status)}`}
        disabled={disabled}
        onClick={onEditAmount}
        className="flex min-w-0 flex-1 cursor-pointer flex-col items-start gap-1 rounded-sm border-0 bg-transparent p-0 text-left text-fg disabled:cursor-not-allowed"
      >
        <b className="break-words text-sm">{player.name}</b>
        <PaymentStatusChip status={player.status} />
        {player.paid ? (
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
