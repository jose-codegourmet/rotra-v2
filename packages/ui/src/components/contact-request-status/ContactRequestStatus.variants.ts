import type {
  ContactChangeField,
  ContactChangeStatus,
} from '@rotra/data/contact-change-request/types'
import type { ChipProps } from '@rotra/ui/chip'
import type { NoticeProps } from '@rotra/ui/notice'

// The prototype's REQ table: 'approved' and 'applying' share one label, so Approved never reads as Applied.
export const REQUEST_STATUS: Record<
  ContactChangeStatus,
  { chip: string; chipTone: ChipProps['tone']; noticeTone: NoticeProps['tone'] }
> = {
  pending: { chip: 'Waiting for review', chipTone: 'warn', noticeTone: 'warn' },
  approved: { chip: 'Approved · being applied', chipTone: 'warn', noticeTone: 'warn' },
  applying: { chip: 'Approved · being applied', chipTone: 'warn', noticeTone: 'warn' },
  applied: { chip: 'Applied', chipTone: 'accent', noticeTone: 'success' },
  failed: { chip: 'Needs attention', chipTone: 'error', noticeTone: 'error' },
  rejected: { chip: 'Not approved', chipTone: 'neutral', noticeTone: 'info' },
}

export const REQUEST_FIELD_LABEL: Record<ContactChangeField, string> = {
  phone: 'Phone number',
  email: 'Email',
}
