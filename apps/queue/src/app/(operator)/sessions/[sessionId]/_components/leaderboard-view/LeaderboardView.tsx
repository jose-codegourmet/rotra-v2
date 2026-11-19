'use client'

import { groupStandings } from '@rotra/data/match/match.rules'
import { useLiveStandings } from '@rotra/data/match/useLiveStandings'
import { useQueueSession } from '@rotra/data/queue-session/useQueueSession'
import { useSessionRoster } from '@rotra/data/session-roster/useSessionRoster'
import { LiveLeaderboard } from '@rotra/ui/live-leaderboard'
import { Skeleton } from '@rotra/ui/skeleton'
import { QueryError } from '@/app/(operator)/_components/query-error/QueryError'
import type { ConsoleViewProps } from '@/app/(operator)/sessions/[sessionId]/_components/session-console/SessionConsole'
import { useClubPlayerPictures } from '@/lib/useClubPlayerPictures'

export type LeaderboardViewProps = ConsoleViewProps

/**
 * Q-LEADERBOARD, the console's Leaderboard view: LiveLeaderboard on useLiveStandings (the
 * computeStandings order: most wins, then fewest losses; players on the same wins and losses share
 * one position, grouped with groupStandings) with each player's level from the roster and the
 * session's minimum games. Every face opens that player's profile through onOpenProfile. A working view for the operator, never official history.
 */
export function LeaderboardView({ sessionId, onOpenProfile }: LeaderboardViewProps) {
  const session = useQueueSession(sessionId)
  const roster = useSessionRoster(sessionId)
  const standings = useLiveStandings(sessionId)
  const { pictureOf } = useClubPlayerPictures()

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

  return <LiveLeaderboard rows={rows} minimumGames={s.minimumGames} onOpenProfile={openProfile} />
}
