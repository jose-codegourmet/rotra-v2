'use client'

import { groupStandings } from '@rotra/data/match/match.rules'
import { useLiveStandings } from '@rotra/data/match/useLiveStandings'
import { recordsGames } from '@rotra/data/queue-session/types'
import { useQueueSession } from '@rotra/data/queue-session/useQueueSession'
import { useSessionRoster } from '@rotra/data/session-roster/useSessionRoster'
import { SessionPodium } from '@rotra/session-page/session-podium'
import { LiveLeaderboard } from '@rotra/ui/live-leaderboard'
import { NotRankedNotice } from '@rotra/ui/not-ranked-notice'
import { Skeleton } from '@rotra/ui/skeleton'
import { useState } from 'react'
import { QueryError } from '@/app/(operator)/_components/query-error/QueryError'
import { PlayerProfile } from '@/app/(operator)/sessions/[sessionId]/_components/player-profile/PlayerProfile'
import type { ConsoleViewProps } from '@/app/(operator)/sessions/[sessionId]/_components/session-console/SessionConsole'
import { useClubPlayerPictures } from '@/lib/useClubPlayerPictures'

export type LeaderboardViewProps = ConsoleViewProps

/**
 * Q-LEADERBOARD, the console's Leaderboard view: LiveLeaderboard on useLiveStandings (the
 * computeStandings order: most wins, then fewest losses; players on the same wins and losses share
 * one position, grouped with groupStandings) with each player's level from the roster and the
 * session's minimum games (a session with Record games off adds the Not ranked notice above). Every face opens that player's profile through onOpenProfile. A working view for the operator, never official history.
 * Between the copy and the table, the session's podium (D-2026-11-25-04): a one-player place opens
 * the shell's profile; a shared place opens Podium place, whose rows open a profile with Back to place.
 */
export function LeaderboardView({ sessionId, onOpenProfile }: LeaderboardViewProps) {
  const session = useQueueSession(sessionId)
  const roster = useSessionRoster(sessionId)
  const standings = useLiveStandings(sessionId)
  const { pictureOf } = useClubPlayerPictures()
  const [fromPlace, setFromPlace] = useState<{ clubPlayerId: string; back: () => void } | null>(
    null,
  )

  if (session.isError || roster.isError || standings.isError)
    return (
      <QueryError
        query={session.isError ? session : roster.isError ? roster : standings}
        title={
          session.isError
            ? "Couldn't load this session."
            : roster.isError
              ? "Couldn't load the roster."
              : "Couldn't load the standings."
        }
      />
    )

  const s = session.data
  if (!s || !roster.data || !standings.data)
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="w-full max-w-[640px]" />
        <Skeleton className="h-56 rounded-lg" />
      </div>
    )

  const rosterList = roster.data.roster
  const rows = groupStandings(standings.data, (r) => {
    const p = rosterList.find((x) => x.id === r.playerId)
    return {
      playerId: r.playerId,
      name: r.name,
      level: p?.level ?? null,
      photoUrl: pictureOf(p?.clubPlayerId),
    }
  })
  const openProfile = (rosterId: string) => {
    const p = rosterList.find((p) => p.id === rosterId)
    if (p) onOpenProfile(p.clubPlayerId)
  }
  const podiumRows = standings.data.map((r) => ({
    id: r.playerId,
    name: r.name,
    pictureUrl: pictureOf(rosterList.find((x) => x.id === r.playerId)?.clubPlayerId),
    position: r.position,
    wins: r.wins,
    losses: r.losses,
    games: r.games,
  }))
  const openFromPodium = (rosterId: string, back?: () => void) => {
    const p = rosterList.find((x) => x.id === rosterId)
    if (!p) return
    if (back) setFromPlace({ clubPlayerId: p.clubPlayerId, back })
    else onOpenProfile(p.clubPlayerId)
  }

  return (
    <div className="flex flex-col gap-3">
      {recordsGames(s) ? null : <NotRankedNotice />}
      <LiveLeaderboard
        rows={rows}
        minimumGames={s.minimumGames}
        onOpenProfile={openProfile}
        podium={<SessionPodium rows={podiumRows} onOpenPlayer={openFromPodium} />}
      />
      <PlayerProfile
        clubPlayerId={fromPlace?.clubPlayerId ?? null}
        onClose={() => setFromPlace(null)}
        backLabel="place"
        onBack={() => {
          fromPlace?.back()
          setFromPlace(null)
        }}
      />
    </div>
  )
}
