'use client'

import {
  buildPaymentShare,
  type PaymentShareFilter,
  type PaymentShareRow,
} from '@rotra/data/session-payment/share-rules'
import { PaymentStatusShareSheet } from '@rotra/ui/payment-status-share-sheet'
import { toast } from '@rotra/ui/toaster'
import { useMemo, useState } from 'react'

export type PaymentStatusShareDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** “Thursday Open Play · Thu, Nov 20” */
  heading: string
  amountDue: number | null
  /** Confirmed players and guests only (no waitlist) */
  rows: PaymentShareRow[]
}

/**
 * Share payment status (#1010): wires the share text rule to the dialog and to the clipboard / the
 * system share sheet. Used by the Queue Master's Payments panel and the public session page.
 */
export function PaymentStatusShareDialog({
  open,
  onOpenChange,
  heading,
  amountDue,
  rows,
}: PaymentStatusShareDialogProps) {
  const [filter, setFilter] = useState<PaymentShareFilter>('all')
  const share = useMemo(
    () => buildPaymentShare({ heading, amountDue, rows, filter }),
    [heading, amountDue, rows, filter],
  )
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(share.text)
      toast('Payment status copied')
    } catch {
      toast.error("Couldn't copy. Try again.")
    }
  }
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'
  const send = async () => {
    try {
      await navigator.share({ title: 'Payment status', text: share.text })
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      await copy()
    }
  }
  return (
    <PaymentStatusShareSheet
      open={open}
      onOpenChange={onOpenChange}
      filter={filter}
      onFilterChange={setFilter}
      counts={share.counts}
      text={share.text}
      onCopy={copy}
      onShare={canShare ? send : undefined}
    />
  )
}
