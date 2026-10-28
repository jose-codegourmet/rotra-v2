import type { ContactChangeRequest } from '@rotra/data/contact-change-request/types'
import { Chip } from '@rotra/ui/chip'
import { Notice } from '@rotra/ui/notice'
import type { ReactNode } from 'react'
import { REQUEST_FIELD_LABEL, REQUEST_STATUS } from './ContactRequestStatus.variants'

export type ContactRequestStatusProps = {
  request: Pick<ContactChangeRequest, 'field' | 'fromValue' | 'toValue' | 'status' | 'requestedAt'>
  /** 'compact' is the chip line for AccountPanel's requestSlot */
  variant?: 'full' | 'compact'
}

function statusText({ field, fromValue, toValue, status }: ContactRequestStatusProps['request']) {
  const f = REQUEST_FIELD_LABEL[field].toLowerCase()
  const from = <span className="font-mono [overflow-wrap:anywhere]">{fromValue}</span>
  const texts: Record<typeof status, ReactNode> = {
    pending: (
      <>
        You asked to change your {f} to <b className="[overflow-wrap:anywhere]">{toValue}</b>.
        Changes take effect only after Admin approval. Until then, keep signing in with {from}.
      </>
    ),
    approved: (
      <>
        Approved. Your new {f} is being set up. Keep signing in with {from} until this says Applied.
      </>
    ),
    applying: (
      <>
        Approved. Your new {f} is being set up. Keep signing in with {from} until this says Applied.
      </>
    ),
    applied: (
      <>
        Your {f} is now <b className="[overflow-wrap:anywhere]">{toValue}</b>. Your player ID and
        game history stay the same.
      </>
    ),
    failed: (
      <>
        The change was approved but couldn't be applied yet. You still sign in with {from}. ROTRA
        will retry or contact you.
      </>
    ),
    rejected: (
      <>
        The platform owner didn't approve changing your {f} to {toValue}. Your current {f} stays.
        You can send a new request.
      </>
    ),
  }
  return texts[status]
}

/** The contact-change request's status: a notice with chip and text, or a compact chip line. */
export function ContactRequestStatus({ request, variant = 'full' }: ContactRequestStatusProps) {
  const s = REQUEST_STATUS[request.status]
  const fieldLabel = REQUEST_FIELD_LABEL[request.field]
  if (variant === 'compact') {
    return (
      <span className="inline-flex flex-wrap items-center gap-1.5 text-sm">
        <Chip tone={s.chipTone}>{s.chip}</Chip> {fieldLabel} change
      </span>
    )
  }
  const sent = new Date(request.requestedAt).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })
  return (
    <Notice tone={s.noticeTone} icon={request.status === 'applied' ? 'check' : 'info'}>
      <span className="mb-1.5 flex flex-wrap items-center gap-2">
        <Chip tone={s.chipTone}>{s.chip}</Chip>
        <span className="text-fg2 text-sm">
          {fieldLabel} change · sent {sent}
        </span>
      </span>
      <span className="block">{statusText(request)}</span>
    </Notice>
  )
}
