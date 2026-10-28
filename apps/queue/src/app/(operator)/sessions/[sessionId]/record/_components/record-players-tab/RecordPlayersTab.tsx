'use client'

import { useLiveStandings } from '@rotra/data/match/useLiveStandings'
import type { SessionRecordSummary } from '@rotra/data/queue-session/types'
import { levelLabel } from '@rotra/ui/level-pill'
import { RecordPlayerCard } from '@rotra/ui/record-player-card'
import { RecordTabHeader } from '@rotra/ui/record-tab-header'
import { useState } from 'react'
import { PlayerProfile } from '@/app/(operator)/sessions/[sessionId]/_components/player-profile/PlayerProfile'

export type RecordPlayersTabProps = {
  sessionId: string
  record: SessionRecordSummary
}

/**
 * The Players tab of the session record (Q-HISTORY): "Players" with "Minimum N games · M below it"
 * ("Not counted" on an invalid session) and a RecordPlayerCard per roster player, most games first
 * then by name, ranked from the standings. A picture opens the player profile dialog.
 */
export function RecordPlayersTab({ sessionId, record }: RecordPlayersTabProps) {
  const invalid = record.state === 'invalid'
  const standings = useLiveStandings(sessionId)
  const [profileId, setProfileId] = useState<string | null>(null)

  const rankOf = new Map(
    invalid ? [] : (standings.data ?? []).map((r, i) => [r.playerId, i + 1] as const),
  )
  const players = record.playerSummaries

  return (
    <div className="flex flex-col gap-4">
      <RecordTabHeader
        title="Players"
        aside={
          invalid
            ? 'Not counted'
            : `Minimum ${record.minimumGames} games · ${record.belowMinimumCount} below it`
        }
      />
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,220px),1fr))] gap-3">
        {players.map((p) => (
          <RecordPlayerCard
            key={p.sessionPlayerId}
            variant={invalid ? 'not-counted' : 'counted'}
            player={{ id: p.sessionPlayerId, name: p.name }}
            levelLabel={levelLabel(p.level)}
            rank={rankOf.get(p.sessionPlayerId)}
            games={p.completedGames}
            minimum={record.minimumGames}
            wins={p.wins}
            losses={p.losses}
            onSelectPlayer={(id) =>
              setProfileId(players.find((x) => x.sessionPlayerId === id)?.clubPlayerId ?? null)
            }
          />
        ))}
      </div>
      <PlayerProfile clubPlayerId={profileId} onClose={() => setProfileId(null)} />
    </div>
  )
}
