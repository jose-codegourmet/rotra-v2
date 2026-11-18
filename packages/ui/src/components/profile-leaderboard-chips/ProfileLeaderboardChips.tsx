import type { LeaderboardPlace } from '@rotra/data/leaderboard/types'
import { Chip } from '@rotra/ui/chip'
import { LEADERBOARD_PERIOD_COPY } from '@rotra/ui/leaderboard-period-switch'

export type ProfileLeaderboardChipsProps = {
  places: readonly LeaderboardPlace[]
}

export function ProfileLeaderboardChips({ places }: ProfileLeaderboardChipsProps) {
  return places.map(({ period, position }) => (
    <Chip key={period}>
      {LEADERBOARD_PERIOD_COPY[period].label} #{position.toLocaleString('en-PH')}
    </Chip>
  ))
}
