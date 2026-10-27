'use client'

import {
  countedGames,
  courtsNeeded,
  FORMAT_LABELS,
  freeCourts,
  listNames,
  type MatchContext,
  matchStatus,
  shortName,
  waitingMatches,
} from '@rotra/data/match/match.rules'
import type { Match } from '@rotra/data/match/types'
import { useSessionMatches } from '@rotra/data/match/useSessionMatches'
import { useStartMatch } from '@rotra/data/match/useStartMatch'
import { useSwapPlayers } from '@rotra/data/match/useSwapPlayers'
import { MockError } from '@rotra/data/mock/errors'
import type { QueueSession } from '@rotra/data/queue-session/types'
import { useQueueSession } from '@rotra/data/queue-session/useQueueSession'
import type { SessionPlayer } from '@rotra/data/session-roster/types'
import { useSessionRoster } from '@rotra/data/session-roster/useSessionRoster'
import { type ChooseMatchRow, ChooseMatchSheet } from '@rotra/ui/choose-match-sheet'
import { StartMatchSheet } from '@rotra/ui/start-match-sheet'
import type { SwapSlot } from '@rotra/ui/swap-sides-area'
import type { TeamLineupPlayer } from '@rotra/ui/team-lineup'
import { toast } from '@rotra/ui/toaster'
import { useRef, useState } from 'react'
import { PlayerProfile } from '@/app/(operator)/sessions/[sessionId]/_components/player-profile/PlayerProfile'

/**
 * What opened the sheets: Start match for a waiting match (Review and start names its court, Start
 * on a queue card leaves it to the first free court, Start here names the court picked another
 * for), or Pick another on a free court.
 */
export type StartMatchRequest =
  | { mode: 'start'; matchId: string; courtId?: string }
  | { mode: 'choose'; courtId: string }

export type StartMatchProps = {
  sessionId: string
  /** The open request; null keeps both sheets closed */
  request: StartMatchRequest | null
  /** Start here in Pick another: the shell replaces the request with the Start match one */
  onRequestChange: (request: StartMatchRequest) => void
  onClose: () => void
}

const CHANGED = 'Something changed. Review the match again.'

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong. Try again.'

/** The recheck at confirmation refused the start: the sheet stays open with refreshed data */
const isRecheckFailure = (error: unknown) =>
  error instanceof MockError && error.kind === 'conflict'

/**
 * Q-DISPATCH / D-START-MATCH and Q-CHOOSE-MATCH: StartMatchSheet on useStartMatch for a waiting
 * match, opened from Review and start (that court preselected), Start on a queue card (the first
 * free court) or Start here in ChooseMatchSheet (that court); a 5v5 preselects a second free court.
 * Each open gets a fresh operationId, so repeated taps cannot start twice. Success toasts
 * "Match N started on Court X" and closes; "Something changed. Review the match again." toasts,
 * stays open and refetches the session, roster and matches so the sheet shows what changed.
 * Switching sides calls useSwapPlayers (the waiting match becomes protected, toast as in the Queue
 * view); a player card opens PlayerProfile with Back to match, which returns to the same sheet.
 * No match ever starts without this confirmation.
 */
export function StartMatch({ sessionId, request, onRequestChange, onClose }: StartMatchProps) {
  const session = useQueueSession(sessionId)
  const roster = useSessionRoster(sessionId)
  const matches = useSessionMatches(sessionId)

  const s = session.data
  if (!request || !s || !roster.data || !matches.data) return null

  const ctx: MatchContext = { roster: roster.data.roster, matches: matches.data, courts: s.courts }
  const refresh = () => {
    void session.refetch()
    void roster.refetch()
    void matches.refetch()
  }

  if (request.mode === 'choose')
    return (
      <ChooseMatch
        courtId={request.courtId}
        ctx={ctx}
        onClose={onClose}
        onStartHere={(matchId) =>
          onRequestChange({ mode: 'start', matchId, courtId: request.courtId })
        }
      />
    )

  const match = ctx.matches.find((m) => m.id === request.matchId && m.state === 'waiting')
  // The match is no longer waiting (started or removed elsewhere): nothing to start.
  if (!match) return null

  return (
    // Remounted per match so the courts, operationId and message start fresh for each open
    <OpenStartMatch
      key={match.id}
      sessionId={sessionId}
      session={s}
      match={match}
      courtId={request.courtId}
      ctx={ctx}
      onClose={onClose}
      onRefresh={refresh}
    />
  )
}

type ChooseMatchProps = {
  courtId: string
  ctx: MatchContext
  onClose: () => void
  onStartHere: (matchId: string) => void
}

/** Q-CHOOSE-MATCH: every waiting match in queue order, Start here on the ready ones */
function ChooseMatch({ courtId, ctx, onClose, onStartHere }: ChooseMatchProps) {
  const court = ctx.courts.find((c) => c.id === courtId)
  const names = (ids: string[]) =>
    listNames(
      ids.map((id) => {
        const p = ctx.roster.find((p) => p.id === id)
        return p ? shortName(p) : 'Player'
      }),
    )
  const rows: ChooseMatchRow[] = waitingMatches(ctx.matches).map((m, i) => ({
    matchId: m.id,
    position: i + 1,
    teamA: names(m.teamA),
    teamB: names(m.teamB),
    formatLabel: FORMAT_LABELS[m.format],
    status: matchStatus(m, ctx),
  }))
  return (
    <ChooseMatchSheet
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      courtLabel={court?.label ?? 'Court'}
      rows={rows}
      onStartHere={onStartHere}
    />
  )
}

type OpenStartMatchProps = {
  sessionId: string
  session: QueueSession
  match: Match
  /** The court that opened the sheet; missing from a queue card's Start */
  courtId?: string
  ctx: MatchContext
  onClose: () => void
  /** The recheck refused the start: refetch so the sheet shows the current players and courts */
  onRefresh: () => void
}

/** Prototype openDispatch: the opening court first (or the first free one), plus one more for 5v5 */
function preselect(match: Match, courtId: string | undefined, ctx: MatchContext) {
  const free = freeCourts(ctx.courts, ctx.matches).map((c) => c.id)
  const first = courtId && free.includes(courtId) ? courtId : free[0]
  if (!first) return []
  return courtsNeeded(match) === 2
    ? [first, ...free.filter((c) => c !== first)].slice(0, 2)
    : [first]
}

/** The open Start match sheet: mounted while open, so its courts and operationId are set once */
function OpenStartMatch({
  sessionId,
  session,
  match,
  courtId,
  ctx,
  onClose,
  onRefresh,
}: OpenStartMatchProps) {
  const startMatch = useStartMatch()
  const swapPlayers = useSwapPlayers()
  const [operationId] = useState(() => crypto.randomUUID())
  const [courtIds, setCourtIds] = useState(() => preselect(match, courtId, ctx))
  const [message, setMessage] = useState<string | undefined>()
  const [profileId, setProfileId] = useState<string | null>(null)
  // One start per attempt: a second tap can land before isPending reaches this render.
  const starting = useRef(false)

  const byId = (id: string) => ctx.roster.find((p) => p.id === id)
  const player = (id: string): TeamLineupPlayer => {
    const p: SessionPlayer | undefined = byId(id)
    return {
      id,
      name: p?.nameSnapshot ?? 'Player',
      shortName: p ? shortName(p) : 'Player',
      level: p?.level ?? null,
      games: countedGames(id, ctx.matches),
    }
  }
  const free = freeCourts(ctx.courts, ctx.matches).map((c) => ({ id: c.id, label: c.label }))
  const status = matchStatus(match, ctx)

  const onSwap = (from: SwapSlot, to: SwapSlot) => {
    if (from.team === to.team || swapPlayers.isPending || startMatch.isPending) return
    const a = (from.team === 'A' ? match.teamA : match.teamB)[from.index]
    const b = (to.team === 'A' ? match.teamA : match.teamB)[to.index]
    if (!a || !b) return
    swapPlayers.mutate(
      { sessionId, matchId: match.id, a, b },
      {
        onSuccess: (result) => toast(result.message),
        onError: (error) => toast.error(errorMessage(error)),
      },
    )
  }

  const onStart = () => {
    if (starting.current || startMatch.isPending) return
    starting.current = true
    setMessage(undefined)
    startMatch.mutate(
      { matchId: match.id, courtIds, operationId },
      {
        onSuccess: (result) => {
          toast(result.message)
          onClose()
        },
        onError: (error) => {
          toast.error(errorMessage(error))
          if (isRecheckFailure(error)) {
            setMessage(CHANGED)
            onRefresh()
          }
        },
        onSettled: () => {
          starting.current = false
        },
      },
    )
  }

  const openProfile = (rosterId: string) => {
    const clubPlayerId = byId(rosterId)?.clubPlayerId
    if (clubPlayerId) setProfileId(clubPlayerId)
  }

  return (
    <>
      <StartMatchSheet
        open
        onOpenChange={(open) => {
          if (!open) onClose()
        }}
        match={{
          matchNo: match.matchNo,
          format: match.format,
          teamA: match.teamA.map(player),
          teamB: match.teamB.map(player),
        }}
        minimumGames={session.minimumGames}
        status={status}
        freeCourts={free}
        courtIds={courtIds}
        onCourtIdsChange={setCourtIds}
        onSelectPlayer={openProfile}
        onSwap={onSwap}
        onBack={onClose}
        onStart={onStart}
        isPending={startMatch.isPending}
        message={message}
      />
      {/* Back to match closes the profile; the sheet underneath keeps its courts and lineup */}
      <PlayerProfile
        clubPlayerId={profileId}
        onClose={() => setProfileId(null)}
        backLabel="match"
        onBack={() => setProfileId(null)}
      />
    </>
  )
}
