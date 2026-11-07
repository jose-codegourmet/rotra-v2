import type { PaymentStatus } from '@rotra/data/session-payment/rules'
import { formatPeso } from '@rotra/schema/money'
import { Chip } from '@rotra/ui/chip'

/** "Paid", "Partial · ₱200 left", "Reimburse · ₱100 to return" or "Unpaid" (#479). */
export function paymentStatusLabel(status: PaymentStatus) {
  if (status.kind === 'paid') return 'Paid'
  if (status.kind === 'partial') return `Partial · ${formatPeso(status.left)} left`
  if (status.kind === 'reimburse') return `Reimburse · ${formatPeso(status.toReturn)} to return`
  return 'Unpaid'
}

const TONE = { paid: 'accent', partial: 'warn', reimburse: 'accent', unpaid: 'neutral' } as const

export type PaymentStatusChipProps = { status: PaymentStatus; className?: string }

/**
 * A player's payment status (#479): the amount received against today's amount due. Reimburse only
 * tracks money to return outside ROTRA.
 */
export function PaymentStatusChip({ status, className }: PaymentStatusChipProps) {
  return (
    <Chip tone={TONE[status.kind]} className={className}>
      {paymentStatusLabel(status)}
    </Chip>
  )
}
