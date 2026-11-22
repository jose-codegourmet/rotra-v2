'use client'

import type { PlayingLevel } from '@rotra/data/player/types'
import {
  type TransferPaymentSnapshot,
  transferWaiverText,
} from '@rotra/data/slot-transfer/transferAccounting.rules'
import { Avatar } from '@rotra/ui/avatar'
import { Button } from '@rotra/ui/button'
import { Chip } from '@rotra/ui/chip'
import { LevelSelect } from '@rotra/ui/level-select'
import { Notice } from '@rotra/ui/notice'
import { type ReactNode, useState } from 'react'

export type SlotTransferRowProps = {
  senderName: string
  senderPhotoUrl?: string
  recipientName: string
  recipientRtrId: string
  /** The recipient's place on the waitlist (1 = next); omit or null when they are not waitlisted */
  recipientWaitlistPosition?: number | null
  /** "7:20 PM" */
  timeLabel: string
  /**
   * The recipient claimed the sender's transfer link (#1012) instead of being picked by RTR ID:
   * the row reads “Shared a transfer link · TIME” and “Claimed by NAME”.
   */
  viaLink?: boolean
  /** The level the select starts on: their waitlist level or saved level here; null for none */
  suggestedLevel?: PlayingLevel | null
  /**
   * What Approve will record (#1013), shown before approving: the slot's cash and the automatic
   * waiver of what it still owes. Omitted: no payment line.
   */
  payment?: TransferPaymentSnapshot
  /** Approve with the level the Queue Master chose for the recipient at this club */
  onApprove: (level: PlayingLevel) => void
  onReject: () => void
  /**
   * **Reject and refund** (#1014): opens the D-REJECT-REFUND confirmation, which states the full
   * refund. The button shows only with this handler and cash collected for the slot
   * (`payment.paidMinor` above 0); a slot with nothing paid has plain Reject only.
   */
  onRejectAndRefund?: () => void
  isPending?: boolean
  error?: ReactNode
}

const LEVEL_ERROR = 'Choose a level for this club before approving.'

/**
 * One pending slot transfer in Requests (#1011, the prototype's transferRow()): the sender, who
 * they want to give the slot to (name and RTR ID), whether that player is on the waitlist, the
 * level the recipient plays at here, and Reject / Approve. A claimed transfer link (#1012) reads
 * “Claimed by NAME”; rejecting it ends the link. #1013: the payment line shows the waiver Approve
 * will record, before approving. #1014: Reject and refund, when cash was collected for the slot,
 * opens the caller's refund confirmation. Presentational: the caller owns the transfer mutations.
 */
export function SlotTransferRow({
  senderName,
  senderPhotoUrl,
  recipientName,
  recipientRtrId,
  recipientWaitlistPosition = null,
  timeLabel,
  viaLink = false,
  suggestedLevel = null,
  payment,
  onApprove,
  onReject,
  onRejectAndRefund,
  isPending = false,
  error,
}: SlotTransferRowProps) {
  const [level, setLevel] = useState<PlayingLevel | null>(suggestedLevel)
  const [missing, setMissing] = useState(false)
  const approve = () => {
    if (isPending) return
    if (!level) {
      setMissing(true)
      return
    }
    onApprove(level)
  }
  return (
    <div className="flex flex-col gap-2.5 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <Avatar name={senderName} src={senderPhotoUrl} />
        <div className="flex min-w-0 flex-1 flex-col">
          <b className="[overflow-wrap:anywhere]">{senderName}</b>
          <span className="text-[13px] text-fg2">
            {viaLink ? 'Shared a transfer link' : 'Asks to transfer their slot'} · {timeLabel}
          </span>
          <span className="text-[13px] font-semibold [overflow-wrap:anywhere]">
            {viaLink ? 'Claimed by' : 'To'} {recipientName} ·{' '}
            <span className="font-mono font-normal">{recipientRtrId}</span>
          </span>
        </div>
        <Chip tone={recipientWaitlistPosition ? 'accent' : 'neutral'}>
          {recipientWaitlistPosition
            ? `Waitlist #${recipientWaitlistPosition}`
            : 'Not in this session'}
        </Chip>
      </div>
      <p className="m-0 text-[13px] text-fg2">
        Approving gives the slot to {recipientName}
        {recipientWaitlistPosition ? ', who leaves the waitlist' : ''}. {senderName} comes off the
        roster. The slot count stays the same.
      </p>
      {payment ? (
        <p className="m-0 text-[13px] [overflow-wrap:anywhere]">
          <b>Payment:</b> {transferWaiverText(payment)} {recipientName} will be Paid in Full and owe
          ₱0. Collected cash stays the same.
        </p>
      ) : null}
      {error ? <Notice tone="error">{error}</Notice> : null}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 max-sm:grid-cols-1">
        <LevelSelect
          disabled={isPending}
          value={level}
          onChange={(next) => {
            setLevel(next)
            setMissing(false)
          }}
          aria-label={`Level for ${recipientName}`}
          missing={missing && level == null}
        />
        <div className="flex flex-wrap items-center gap-2 max-sm:[&>*]:flex-1">
          <Button
            size="sm"
            disabled={isPending}
            onClick={onReject}
            aria-label={`Reject ${senderName}'s transfer`}
          >
            Reject
          </Button>
          {onRejectAndRefund && (payment?.paidMinor ?? 0) > 0 ? (
            <Button
              size="sm"
              disabled={isPending}
              onClick={onRejectAndRefund}
              aria-haspopup="dialog"
              aria-label={`Reject ${senderName}'s transfer and refund`}
            >
              Reject and refund
            </Button>
          ) : null}
          <Button
            size="sm"
            variant="primary"
            disabled={isPending}
            onClick={approve}
            aria-label={`Approve transfer to ${recipientName}`}
          >
            Approve
          </Button>
        </div>
      </div>
      <span aria-live="polite" className="text-[13px] font-semibold text-error empty:hidden">
        {missing && level == null ? LEVEL_ERROR : ''}
      </span>
    </div>
  )
}
