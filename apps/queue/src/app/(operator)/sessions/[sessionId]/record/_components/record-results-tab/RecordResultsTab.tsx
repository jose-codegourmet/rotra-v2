'use client'

import { useClub } from '@rotra/data/club'
import { useClubPlayers } from '@rotra/data/club-player/useClubPlayers'
import { DEMO_CLUB_ID } from '@rotra/data/fixtures/clubs'
import { useLiveStandings } from '@rotra/data/match/useLiveStandings'
import type { SessionRecordSummary } from '@rotra/data/queue-session/types'
import { useQueueSession } from '@rotra/data/queue-session/useQueueSession'
import { Button } from '@rotra/ui/button'
import { Icon } from '@rotra/ui/icon'
import { InvalidSessionNotice } from '@rotra/ui/invalid-session-notice'
import { LeaderboardShareCard } from '@rotra/ui/leaderboard-share-card'
import { LiveLeaderboard, type LiveLeaderboardRow } from '@rotra/ui/live-leaderboard'
import { profilePictureSrc } from '@rotra/ui/profile-picture'
import { RecordTabHeader } from '@rotra/ui/record-tab-header'
import { ShareDialog } from '@rotra/ui/share-dialog'
import { Skeleton } from '@rotra/ui/skeleton'
import { toast } from '@rotra/ui/toaster'
import Link from 'next/link'
import { useState } from 'react'
import { QueryError } from '@/app/(operator)/_components/query-error/QueryError'
import { PlayerProfile } from '@/app/(operator)/sessions/[sessionId]/_components/player-profile/PlayerProfile'
import { ExportImagesSheetContainer } from '@/app/(operator)/sessions/[sessionId]/results/_components/export-images-sheet/ExportImagesSheetContainer'

export type RecordResultsTabProps = {
  sessionId: string
  record: SessionRecordSummary
}

/** The prototype's fmtDate: "Thu, Oct 23" */
const date = (at: number) =>
  new Date(at).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })

/**
 * The Results tab of the session record (Q-HISTORY): "Standings" with Share leaderboard
 * (2026-11-13-share-leaderboard: ShareDialog with LeaderboardShareCard, no viewer row), Result
 * slides (the results route) and Download images (the export sheet), then the official standings
 * as the LiveLeaderboard record variant. An invalid session shows only the no-official-result notice.
 */
export function RecordResultsTab({ sessionId, record }: RecordResultsTabProps) {
  const invalid = record.state === 'invalid'
  const standings = useLiveStandings(sessionId)
  const session = useQueueSession(sessionId)
  const club = useClub(DEMO_CLUB_ID)
  const clubPlayers = useClubPlayers()
  const [exportOpen, setExportOpen] = useState(false)
  const [sharing, setSharing] = useState(false)
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
  /** The saved player's own picture (or character), like the Queue tab */
  const pictureOf = (sessionPlayerId: string) => {
    const clubPlayerId = players.find((p) => p.sessionPlayerId === sessionPlayerId)?.clubPlayerId
    const p = clubPlayers.data?.players.find((x) => x.id === clubPlayerId)
    return p
      ? (profilePictureSrc(p.picture, p.playerId ?? p.id, p.pictureName ?? p.fullName) ?? null)
      : null
  }
  const c = club.data
  const slug = session.data?.publicSlug
  const link =
    slug && typeof location !== 'undefined'
      ? `${location.origin}/s/${encodeURIComponent(slug)}`
      : ''
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link)
      toast('Link copied')
    } catch {
      toast.error("Couldn't copy the link. Copy it from the field.")
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <RecordTabHeader
        title="Standings"
        actions={
          <>
            {rows?.length && c && link ? (
              <Button size="sm" onClick={() => setSharing(true)}>
                <Icon name="share" />
                Share leaderboard
              </Button>
            ) : null}
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
      {rows && c && link ? (
        <ShareDialog open={sharing} onOpenChange={setSharing} title="Share leaderboard">
          <LeaderboardShareCard
            rows={rows.map((row, i) => ({
              position: i + 1,
              name: row.name,
              pictureUrl: pictureOf(row.playerId),
              wins: row.wins,
              losses: row.losses,
              games: row.games,
            }))}
            sessionTitle={record.title}
            dateLine={`${date(record.scheduledStartAt)} · ${c.name}`}
            club={{ initials: c.initials, logoUrl: c.logoUrl }}
            link={link}
            onCopy={() => void copyLink()}
            onError={(message) => toast.error(message)}
            onDownloaded={(item) => toast(`${item.label} downloaded`)}
          />
        </ShareDialog>
      ) : null}
      <ExportImagesSheetContainer
        sessionId={sessionId}
        open={exportOpen}
        onOpenChange={setExportOpen}
      />
      <PlayerProfile clubPlayerId={profileId} onClose={() => setProfileId(null)} />
    </div>
  )
}
