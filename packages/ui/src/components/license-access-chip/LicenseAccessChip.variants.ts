import type { ClubAccessState } from '@rotra/data/license/types'
import type { ChipProps } from '@rotra/ui/chip'

// rotra-admin.html accessChip(): .ok for Active, .warn for ending within 7 days or not started yet,
// .bad for Expired, plain for No license yet.
export const ENDS_SOON_DAYS = 7

/** Chip label and tone for one access state; formatting only, no date math. */
export function licenseAccessLabel(access: ClubAccessState): {
  label: string
  tone: ChipProps['tone']
} {
  switch (access.state) {
    case 'active':
      if (access.days > ENDS_SOON_DAYS) return { label: 'Active', tone: 'accent' }
      if (access.days === 0) return { label: 'Ends today', tone: 'warn' }
      return {
        label: `Ends in ${access.days} day${access.days === 1 ? '' : 's'}`,
        tone: 'warn',
      }
    case 'expired':
      return { label: 'Expired', tone: 'error' }
    case 'scheduled':
      return { label: `Starts ${formatYmd(access.starts)}`, tone: 'warn' }
    case 'none':
      return { label: 'No license yet', tone: 'neutral' }
  }
}

/** "2026-11-15" → "Nov 15, 2026", read as a calendar date so no time zone can shift the day. */
export function formatYmd(ymd: string): string {
  return new Date(`${ymd}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}
