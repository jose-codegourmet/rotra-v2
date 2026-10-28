'use client'

import { useLiveStandings } from '@rotra/data/match/useLiveStandings'
import type { SessionRecordSummary } from '@rotra/data/queue-session/types'
import { Button } from '@rotra/ui/button'
import { InvalidSessionNotice } from '@rotra/ui/invalid-session-notice'
import { LiveLeaderboard, type LiveLeaderboardRow } from '@rotra/ui/live-leaderboard'
import { RecordTabHeader } from '@rotra/ui/record-tab-header'
import { Skeleton } from '@rotra/ui/skeleton'
import Link from 'next/link'
import { useState } from 'react'
import { QueryError } from '@/app/(operator)/_components/query-error/QueryError'
import { PlayerProfile } from '@/app/(operator)/sessions/[sessionId]/_components/player-profile/PlayerProfile'
import { ExportImagesSheetContainer } from '@/app/(operator)/sessions/[sessionId]/results/_components/export-images-sheet/ExportImagesSheetContainer'

export type RecordResultsTabProps = {
  sessionId: string
  record: SessionRecordSummary
}

/**
 * The Results tab of the session record (Q-HISTORY): "Standings" with Result slides (the results
 * route) and Download images (the export sheet), then the official standings as the LiveLeaderboard
 * record variant. An invalid session shows only the no-official-result notice.
 */
export function RecordResultsTab({ sessionId, record }: RecordResultsTabProps) {
  const invalid = record.state === 'invalid'
  const standings = useLiveStandings(sessionId)
  const [exportOpen, setExportOpen] = useState(false)
  const [profileId, setProfileId] = useState<string | null>(null)

  if (invalid)
    return <InvalidSessionNotice variant="results" reason={record.invalidReason ?? undefined} />

  const players = record.playerSummaries
  const rows: LiveLeaderboardRow[] | undefined = standings.data?.map((r) => ({
    playerId: r.playerId,
    name: r.name,
    level: players.find((p) => p.sessionPlayerId === r.playerId)?.level ?? null,
    wins: r.wins,
    losses: r.losses,
    games: r.games,
  }))
  const openProfile = (sessionPlayerId: string) =>
    setProfileId(players.find((p) => p.sessionPlayerId === sessionPlayerId)?.clubPlayerId ?? null)

  return (
    <div className="flex flex-col gap-4">
      <RecordTabHeader
        title="Standings"
        actions={
          <>
            <Button asChild size="sm">
              <Link href={`/sessions/${sessionId}/results`}>Result slides</Link>
            </Button>
            <Button size="sm" onClick={() => setExportOpen(true)}>
              Download images
            </Button>
          </>
        }
      />
      {standings.isError ? (
        <QueryError query={standings} title="Couldn't load the standings." />
      ) : rows ? (
        <LiveLeaderboard variant="record" rows={rows} onOpenProfile={openProfile} />
      ) : (
        <div role="status" aria-busy aria-label="Loading the standings">
          <Skeleton className="h-56 rounded-lg" />
        </div>
      )}
      <ExportImagesSheetContainer
        sessionId={sessionId}
        open={exportOpen}
        onOpenChange={setExportOpen}
      />
      <PlayerProfile clubPlayerId={profileId} onClose={() => setProfileId(null)} />
    </div>
  )
}
