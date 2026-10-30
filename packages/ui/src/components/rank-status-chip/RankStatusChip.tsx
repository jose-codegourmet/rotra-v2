import type { PlayerRankStatus } from '@rotra/data/admin-player/types'
import { Chip } from '@rotra/ui/chip'

export type RankStatusChipProps = {
  /** Computed upstream (A03.5); the chip only formats it */
  status: PlayerRankStatus
  className?: string
}

// rotra-admin.html rankOf(): only On leaderboard is .ok.
const RANK_STATUS = {
  none: { label: 'No rank yet', tone: 'neutral' },
  below: { label: 'Below requirement', tone: 'neutral' },
  board: { label: 'On leaderboard', tone: 'accent' },
} as const satisfies Record<PlayerRankStatus['kind'], { label: string; tone: 'neutral' | 'accent' }>

/** A player's overall ROTRA leaderboard status in Admin: No rank yet, Below requirement or On leaderboard. */
export function RankStatusChip({ status, className }: RankStatusChipProps) {
  const { label, tone } = RANK_STATUS[status.kind]
  return (
    <Chip tone={tone} className={className}>
      {label}
    </Chip>
  )
}
