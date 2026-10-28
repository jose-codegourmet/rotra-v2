'use client'

import { formatPeso } from '@rotra/schema/money'
import { Avatar } from '@rotra/ui/avatar'
import { cn } from '@rotra/ui/cn'
import { Switch } from '@rotra/ui/switch'

export type PaymentPlayer = {
  clubPlayerId: string
  name: string
  picture?: string | null
  paid?: { amount: number; at: number }
}
export type PaymentCardProps = {
  player: PaymentPlayer
  amountDue: number | null
  onTogglePaid: () => void
  onSelectPlayer: () => void
  disabled?: boolean
}
export function PaymentCard({
  player,
  amountDue,
  onTogglePaid,
  onSelectPlayer,
  disabled,
}: PaymentCardProps) {
  return (
    <article
      className={cn(
        'flex min-w-0 flex-col gap-1 rounded-lg border border-border bg-surface p-3 shadow-card',
        player.paid && 'border-accent bg-accent-subtle',
      )}
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <Avatar
          size={44}
          name={player.name}
          src={player.picture ?? undefined}
          onClick={onSelectPlayer}
          className={player.paid ? 'ring-2 ring-accent' : undefined}
        />
        <Switch
          aria-label={`${player.name} paid`}
          checked={!!player.paid}
          onChange={onTogglePaid}
          disabled={disabled}
        />
      </div>
      <b className="break-words text-sm">{player.name}</b>
      <span className={cn('text-xs text-fg2', player.paid && 'font-semibold text-accent')}>
        {player.paid
          ? `✓ Paid ${formatPeso(player.paid.amount)} · ${new Date(player.paid.at).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Manila' })}`
          : amountDue === null
            ? 'Not paid'
            : `${formatPeso(amountDue)} due`}
      </span>
    </article>
  )
}
