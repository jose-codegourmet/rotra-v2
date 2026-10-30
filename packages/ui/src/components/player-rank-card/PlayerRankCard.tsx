import type { PlayerRankStatus } from '@rotra/data/admin-player/types'
import type { PlayingLevel } from '@rotra/data/player/types'
import { Card } from '@rotra/ui/card'
import { KeyValueList } from '@rotra/ui/key-value-list'
import { levelLabel } from '@rotra/ui/level-pill'
import { useId } from 'react'

export type PlayerRankCardProps = {
  /** Computed upstream from the ranking configuration in effect (A03.5); no rank math here */
  status: PlayerRankStatus
  /** The player's level; ignored when status is none */
  level: PlayingLevel | null
  /** Complete standard matches in the last three months */
  recentMatches: number
  /** Recent matches the leaderboard needs, from the configuration in effect (never a draft) */
  matchRequirement: number
}

function rankText({ status, level, recentMatches, matchRequirement }: PlayerRankCardProps) {
  if (status.kind === 'none' || !level) return 'No rank yet'
  if (status.kind === 'below') {
    return `${levelLabel(level)} · ${recentMatches} of ${matchRequirement} recent matches`
  }
  return `${levelLabel(level)} · on the overall leaderboard`
}

/**
 * Admin player detail (A-PLAYER-DETAIL): read-only rank context. There are deliberately no edit
 * controls; Admin can't change ranks, winners or scores.
 */
export function PlayerRankCard(props: PlayerRankCardProps) {
  const headingId = useId()
  return (
    <Card asChild>
      <section aria-labelledby={headingId} className="flex flex-col gap-3">
        <h2 id={headingId}>Rank and games</h2>
        <KeyValueList
          items={[
            { label: 'Rank', value: rankText(props) },
            {
              label: 'Recent matches',
              value: `${props.recentMatches} complete standard matches in the last three months · leaderboard needs ${props.matchRequirement}`,
            },
          ]}
        />
        <p className="m-0 text-[13px] text-fg2">
          Read-only. Admin can't change ranks, winners or scores, and can't rebuild lost session
          records.
        </p>
      </section>
    </Card>
  )
}
