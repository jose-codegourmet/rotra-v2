'use client'

import type { PaymentStatus } from '@rotra/data/session-payment/rules'
import type { SlotPaymentTransfer } from '@rotra/data/slot-transfer/slotTransfer.types'
import { formatPeso } from '@rotra/schema/money'
import { Notice } from '@rotra/ui/notice'
import { PaymentStatusChip } from '@rotra/ui/payments-checklist/payment-status-chip'

export type SlotTransferHistoryProps = {
  /** The player who holds the slot now */
  holderName: string
  /** The slot's waivers and approved transfers, oldest first */
  transfer: SlotPaymentTransfer
  /** Cash collected for the slot (every holder's), never a waived amount */
  cashMinor: number
  status: PaymentStatus
  className?: string
}

const whenOf = (at: number) =>
  new Date(at).toLocaleString('en-PH', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Asia/Manila',
  })

/**
 * Slot history (#1013, the prototype's slotHistory sheet): how a slot reached its holder through
 * approved slot transfers, oldest first. Each step: who gave it to whom, what the giver paid
 * themselves (the first giver is the original payer), what the approval waived, when it was
 * approved. Then the slot's cash collected, the total waived (not cash) and the status. Read-only:
 * the record is append-only. Presentational; the caller puts it in a Sheet.
 */
export function SlotTransferHistory({
  holderName,
  transfer,
  cashMinor,
  status,
  className,
}: SlotTransferHistoryProps) {
  const steps = transfer.steps
  const original = steps[0]?.fromName
  return (
    <div className={className ?? 'flex min-w-0 flex-col gap-4'}>
      <p className="m-0 text-sm text-fg2">
        {holderName} holds this slot through {steps.length} approved transfer
        {steps.length === 1 ? '' : 's'}.{original ? ` ${original} is the original payer.` : ''} Past
        transfers are never changed.
      </p>
      <ol className="m-0 flex flex-col gap-3 pl-5">
        {steps.map((step) => (
          <li key={step.transferId} className="[overflow-wrap:anywhere]">
            <b>
              {step.fromName} → {step.toName}
            </b>
            <br />
            <span className="text-[13px] text-fg2">
              {step.fromName} paid {formatPeso(step.paidByGiverMinor)} ·{' '}
              {step.waivedMinor ? `${formatPeso(step.waivedMinor)} waived` : 'nothing waived'} ·
              approved {whenOf(step.approvedAt)} by the Queue Master
              {step.viaLink ? ' · transfer link' : ''}
            </span>
          </li>
        ))}
      </ol>
      <dl className="m-0 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm">
        <dt className="text-fg2">Cash collected for this slot</dt>
        <dd className="m-0 font-semibold tabular-nums">{formatPeso(cashMinor)}</dd>
        <dt className="text-fg2">Waived</dt>
        <dd className="m-0 tabular-nums">{formatPeso(transfer.waivedMinor)} · not cash</dd>
        <dt className="text-fg2">Status</dt>
        <dd className="m-0">
          <PaymentStatusChip status={status} />
        </dd>
      </dl>
      <Notice>
        A waived amount is never collected cash. ROTRA moves no money; it only keeps the record.
      </Notice>
    </div>
  )
}
