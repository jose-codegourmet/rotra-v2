import type { RetentionState } from '@rotra/data/license/types'
import type { ChipProps } from '@rotra/ui/chip'

// rotra-admin.html retentionCard() head chip: .ok while pages are live, .warn for a countdown or a
// deletion in progress, .bad for a failed attempt, plain once the pages are gone.
const RETENTION_CHIP: Record<RetentionState['k'], { label: string; tone: ChipProps['tone'] }> = {
  none: { label: 'Pages live', tone: 'accent' },
  restored: { label: 'Pages live', tone: 'accent' },
  stale: { label: 'Pages stale', tone: 'warn' },
  due: { label: 'Deletion due', tone: 'warn' },
  failed: { label: 'Deletion failed', tone: 'error' },
  deleted: { label: 'Pages deleted', tone: 'neutral' },
}

/** Chip label and tone for one retention state; formatting only, no date math. */
export function retentionChip(retention: RetentionState): {
  label: string
  tone: ChipProps['tone']
} {
  return RETENTION_CHIP[retention.k]
}
