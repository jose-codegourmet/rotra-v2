import type { ContactChangeStatus } from '@rotra/data/contact-change-request/types'
import { Chip } from '@rotra/ui/chip'
import { ADMIN_REQUEST_STATUS } from './ContactRequestStatusChip.variants'

export type ContactRequestStatusChipProps = {
  status: ContactChangeStatus
  /** A newer request for the same field, or a contact clash, blocks this one */
  conflict?: boolean
}

/** Admin's contact-change status chip (A-CONTACT-REQUESTS, A-CONTACT-REVIEW), plus Conflict. */
export function ContactRequestStatusChip({ status, conflict }: ContactRequestStatusChipProps) {
  const s = ADMIN_REQUEST_STATUS[status]
  const chip = <Chip tone={s.tone}>{s.label}</Chip>
  if (!conflict) return chip
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {chip}
      <Chip tone="error">Conflict</Chip>
    </span>
  )
}
