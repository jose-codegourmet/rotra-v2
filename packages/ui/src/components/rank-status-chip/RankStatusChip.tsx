import type { PlayerRankStatus } from '@rotra/data/admin-player/types'
import { Chip } from '@rotra/ui/chip'

export type RankStatusChipProps = {
  /** Computed upstream (A03.5); the chip only formats it */
  status: PlayerRankStatus
  /**
   * An unclaimed player saved by more than one club with a rank: shows Not on leaderboard instead
   * (rotra-admin.html rankOf()). Ignored for No rank yet.
   */
  notOnLeaderboard?: boolean
  className?: string
}

// rotra-admin.html rankOf(): only On leaderboard is .ok.
const RANK_STATUS = {
  none: { label: 'No rank yet', tone: 'neutral' },
  below: { label: 'Below requirement', tone: 'neutral' },
  board: { label: 'On leaderboard', tone: 'accent' },
} as const satisfies Record<PlayerRankStatus['kind'], { label: string; tone: 'neutral' | 'accent' }>

/**
 * A player's overall ROTRA leaderboard status in Admin: No rank yet, Below requirement, On
 * leaderboard or Not on leaderboard.
 */
export function RankStatusChip({ status, notOnLeaderboard, className }: RankStatusChipProps) {
  const { label, tone } =
    notOnLeaderboard && status.kind !== 'none'
      ? { label: 'Not on leaderboard', tone: 'neutral' as const }
      : RANK_STATUS[status.kind]
  return (
    <Chip tone={tone} className={className}>
      {label}
    </Chip>
  )
}
