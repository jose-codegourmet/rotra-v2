'use client'

import { useLiveStandings } from '@rotra/data/match/useLiveStandings'
import { useQueueSession } from '@rotra/data/queue-session/useQueueSession'
import { useSessionRoster } from '@rotra/data/session-roster/useSessionRoster'
import { LiveLeaderboard, type LiveLeaderboardRow } from '@rotra/ui/live-leaderboard'
import { Skeleton } from '@rotra/ui/skeleton'
import { QueryError } from '@/app/(operator)/_components/query-error/QueryError'
import type { ConsoleViewProps } from '@/app/(operator)/sessions/[sessionId]/_components/session-console/SessionConsole'

export type LeaderboardViewProps = ConsoleViewProps

/**
 * Q-LEADERBOARD, the console's Leaderboard view: LiveLeaderboard on useLiveStandings (the
 * computeStandings order: most wins, fewest losses, head-to-head) with each row's level from the
 * roster and the session's minimum games. Pictures open the player's profile through
 * onOpenProfile. A working view for the operator, never official history.
 */
export function LeaderboardView({ sessionId, onOpenProfile }: LeaderboardViewProps) {
  const session = useQueueSession(sessionId)
  const roster = useSessionRoster(sessionId)
  const standings = useLiveStandings(sessionId)

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
  const rows: LiveLeaderboardRow[] = standings.data.map((r) => ({
    playerId: r.playerId,
    name: r.name,
    level: rosterList.find((p) => p.id === r.playerId)?.level ?? null,
    wins: r.wins,
    losses: r.losses,
    games: r.games,
  }))
  const openProfile = (rosterId: string) => {
    const p = rosterList.find((p) => p.id === rosterId)
    if (p) onOpenProfile(p.clubPlayerId)
  }

  return <LiveLeaderboard rows={rows} minimumGames={s.minimumGames} onOpenProfile={openProfile} />
}
