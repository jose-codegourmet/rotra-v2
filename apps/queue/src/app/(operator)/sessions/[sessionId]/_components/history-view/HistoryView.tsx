'use client'

import { useSessionMatches } from '@rotra/data/match/useSessionMatches'
import { useQueueSession } from '@rotra/data/queue-session/useQueueSession'
import { useSessionRoster } from '@rotra/data/session-roster/useSessionRoster'
import { playerFacingName } from '@rotra/data/session-roster/sessionRoster.rules'
import { LiveMatchHistory, type LiveMatchHistoryMatch } from '@rotra/ui/live-match-history'
import { Skeleton } from '@rotra/ui/skeleton'
import { useState } from 'react'
import { QueryError } from '@/app/(operator)/_components/query-error/QueryError'
import type { ConsoleViewProps } from '@/app/(operator)/sessions/[sessionId]/_components/session-console/SessionConsole'
import { useClubPlayerPictures } from '@/lib/useClubPlayerPictures'

export type HistoryViewProps = ConsoleViewProps

/**
 * Q-CONSOLE, the console's Match History view: LiveMatchHistory on tonight's finished matches
 * (completed and invalid, from useSessionMatches), each court newest first. A 5v5 lists both of its
 * courts. Faces open the player's profile through onOpenProfile (the shell's PlayerProfile). The
 * court filter is local state, not the URL.
 */
export function HistoryView({ sessionId, onOpenProfile }: HistoryViewProps) {
  const session = useQueueSession(sessionId)
  const roster = useSessionRoster(sessionId)
  const matches = useSessionMatches(sessionId)
  const { pictureOf } = useClubPlayerPictures()
  const [courtFilter, setCourtFilter] = useState('all')

  if (session.isError || roster.isError || matches.isError)
    return (
      <QueryError
        query={session.isError ? session : roster.isError ? roster : matches}
        title={
          session.isError
            ? "Couldn't load this session."
            : roster.isError
              ? "Couldn't load the roster."
              : "Couldn't load the matches."
        }
      />
    )

  const s = session.data
  if (!s || !roster.data || !matches.data)
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="w-full max-w-[640px]" />
        <Skeleton className="h-56 rounded-lg" />
      </div>
    )

  const rosterList = roster.data.roster
  const playerOf = (id: string) => {
    const p = rosterList.find((x) => x.id === id)
    return p
      ? {
          id,
          name: p.nameSnapshot,
          shortName: playerFacingName(p),
          level: p.level,
          photoUrl: pictureOf(p.clubPlayerId),
        }
      : { id, name: 'Player', shortName: 'Player', level: null }
  }
  const nameOf = (id: string) => playerOf(id).name

  // Done and invalid matches that ran, newest first.
  const finished: LiveMatchHistoryMatch[] = matches.data
    .filter((m) => (m.state === 'completed' || m.state === 'invalid') && m.startedAt != null)
    .sort((a, b) => (b.endedAt ?? 0) - (a.endedAt ?? 0))
    .map((m) => ({
      id: m.id,
      number: m.matchNo,
      courtIds: m.courtIds,
      startedAt: m.startedAt ?? 0,
      endedAt: m.endedAt ?? m.startedAt ?? 0,
      fun: m.format.startsWith('fun_'),
      teamA: m.teamA.map(playerOf),
      teamB: m.teamB.map(playerOf),
      winningTeam: m.decision?.winningTeam ?? null,
      score:
        m.decision?.teamAScore != null && m.decision.teamBScore != null
          ? { teamA: m.decision.teamAScore, teamB: m.decision.teamBScore }
          : null,
      games: m.decision?.games?.length ? m.decision.games : null,
      invalid: m.state === 'invalid',
      substitutionCredits: m.substitutions.map((sub) => ({
        outName: nameOf(sub.outId),
        inName: nameOf(sub.inId),
        creditTo: !sub.creditTo || sub.creditTo === 'none' ? 'nobody' : sub.creditTo,
      })),
    }))

  // A court that was removed stays only while a finished match used it.
  const courts = s.courts
    .filter((c) => !c.removedAt || finished.some((m) => m.courtIds.includes(c.id)))
    .map((c) => ({ id: c.id, label: c.label }))

  const openPlayer = (rosterId: string) => {
    const p = rosterList.find((x) => x.id === rosterId)
    if (p) onOpenProfile(p.clubPlayerId)
  }

  return (
    <LiveMatchHistory
      courts={courts}
      matches={finished}
      courtFilter={courtFilter}
      onCourtFilterChange={setCourtFilter}
      onOpenPlayer={openPlayer}
    />
  )
}
