import type { ContactChangeStatus } from '@rotra/data/contact-change-request/types'
import type { ChipProps } from '@rotra/ui/chip'

// The Admin prototype's REQ table. It has no resting 'approved' state, so approved and applying share
// one label and an approved change never reads as Applied. The player's own wording
// ('Approved · being applied') lives in contact-request-status/variants.
export const ADMIN_REQUEST_STATUS: Record<
  ContactChangeStatus,
  { label: string; tone: ChipProps['tone'] }
> = {
  pending: { label: 'Waiting for review', tone: 'warn' },
  approved: { label: 'Approved · applying', tone: 'warn' },
  applying: { label: 'Approved · applying', tone: 'warn' },
  applied: { label: 'Applied', tone: 'accent' },
  failed: { label: 'Needs attention', tone: 'error' },
  rejected: { label: 'Not approved', tone: 'neutral' },
}
