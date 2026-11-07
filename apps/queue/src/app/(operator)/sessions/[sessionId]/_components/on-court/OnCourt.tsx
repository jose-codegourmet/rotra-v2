'use client'

import {
  countedGames,
  courtNames,
  courtsNeeded,
  freeCourts,
  listNames,
  type MatchContext,
  matchStatus,
  shortName,
  swapTarget,
} from '@rotra/data/match/match.rules'
import type { Match } from '@rotra/data/match/types'
import { useSessionMatches } from '@rotra/data/match/useSessionMatches'
import { useStartMatch } from '@rotra/data/match/useStartMatch'
import { MockError } from '@rotra/data/mock/errors'
import type { QueueSession } from '@rotra/data/queue-session/types'
import { useQueueSession } from '@rotra/data/queue-session/useQueueSession'
import type { SessionPlayer } from '@rotra/data/session-roster/types'
import { useSessionRoster } from '@rotra/data/session-roster/useSessionRoster'
import { formatWhen } from '@rotra/ui/now-card/helpers'
import { OnCourtSheet } from '@rotra/ui/on-court-sheet'
import type { TeamLineupPlayer } from '@rotra/ui/team-lineup'
import { toast } from '@rotra/ui/toaster'
import { useEffect, useRef, useState } from 'react'
import { PlayerProfile } from '@/app/(operator)/sessions/[sessionId]/_components/player-profile/PlayerProfile'

export type OnCourtProps = {
  sessionId: string
  /** The console clock: the placed time and the rechecks are measured against it */
  now: number
  /** The On court match to open (Open match on a Getting ready court card); null keeps the sheet closed */
  matchId: string | null
  onClose: () => void
}

const CHANGED = 'Something changed. Review the match again.'

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong. Try again.'

/** The recheck at Start match refused the start: the sheet stays open with refreshed data */
const isRecheckFailure = (error: unknown) => error instanceof MockError && error.kind === 'conflict'

/**
 * Q-ON-COURT: OnCourtSheet for a match On court (placed, not started), opened by Open match on a
 * Getting ready court card. Start match is one tap on useStartMatch with the held court(s): the
 * owner rechecks presence and busy players, success toasts "Match N started on Court X" and closes;
 * "Something changed. Review the match again." toasts, stays open and refetches. A local save
 * failure is an error toast and an error inside the sheet, and Start match retries the same
 * operationId. A Start match block reason (a player not present or busy) comes from matchStatus.
 * Player cards open PlayerProfile with Back to match. The sheet closes by itself once the match is
 * no longer On court (started, sent back or changed elsewhere).
 */
export function OnCourt({ sessionId, now, matchId, onClose }: OnCourtProps) {
  const session = useQueueSession(sessionId)
  const roster = useSessionRoster(sessionId)
  const matches = useSessionMatches(sessionId)

  const match = matchId ? matches.data?.find((m) => m.id === matchId) : undefined
  // Started, sent back or removed elsewhere: there is nothing on court to control.
  const gone = Boolean(matchId && matches.data && (!match || match.state !== 'on_court'))
  useEffect(() => {
    if (gone) onClose()
  }, [gone, onClose])

  const s = session.data
  if (!match || match.state !== 'on_court' || !s || !roster.data || !matches.data) return null

  const ctx: MatchContext = { roster: roster.data.roster, matches: matches.data, courts: s.courts, now }
  const refresh = () => {
    void session.refetch()
    void roster.refetch()
    void matches.refetch()
  }

  return (
    // Remounted per match so the operationId and messages start fresh for each open
    <OpenOnCourt
      key={match.id}
      session={s}
      match={match}
      ctx={ctx}
      onClose={onClose}
      onRefresh={refresh}
    />
  )
}

type OpenOnCourtProps = {
  session: QueueSession
  match: Match
  ctx: MatchContext
  onClose: () => void
  onRefresh: () => void
}

function OpenOnCourt({ session, match, ctx, onClose, onRefresh }: OpenOnCourtProps) {
  const startMatch = useStartMatch()
  const [operationId] = useState(() => crypto.randomUUID())
  const [message, setMessage] = useState<string | undefined>()
  const [error, setError] = useState<string | undefined>()
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
  const names = (ids: string[]) => listNames(ids.map((id) => player(id).shortName))
  const status = matchStatus(match, ctx)
  const swap = swapTarget(match, ctx)
  const now = ctx.now ?? Date.now()
  const free = freeCourts(ctx.courts, ctx.matches, now)

  const onStart = () => {
    if (starting.current || startMatch.isPending) return
    starting.current = true
    setMessage(undefined)
    setError(undefined)
    startMatch.mutate(
      { matchId: match.id, courtIds: [], operationId },
      {
        onSuccess: (result) => {
          toast(result.message)
          onClose()
        },
        onError: (failure) => {
          toast.error(errorMessage(failure))
          if (isRecheckFailure(failure)) {
            setMessage(CHANGED)
            onRefresh()
          } else {
            // A save failure wrote nothing: the match is still On court, so Start match retries
            // the same operationId.
            setError(errorMessage(failure))
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

  // Send back to queue, Move to another court, Replace player and Swap with the queue are wired by
  // Q12.26; switching sides on an On court match has no command yet (swapPlayers takes waiting
  // matches only). Until then these do nothing.
  const notYet = () => {}

  return (
    <>
      <OnCourtSheet
        open
        onOpenChange={(open) => {
          if (!open) onClose()
        }}
        matchNo={match.matchNo}
        courtLabel={courtNames(match, ctx.courts)}
        format={match.format}
        placedLabel={formatWhen(match.placedAt ?? now, now, { lower: true })}
        teamA={match.teamA.map(player)}
        teamB={match.teamB.map(player)}
        minimumGames={session.minimumGames}
        blockReason={status.kind === 'ready' ? undefined : status.reason}
        swapTarget={
          swap
            ? {
                matchNo: swap.match.matchNo,
                position: swap.position,
                teamANames: names(swap.match.teamA),
                teamBNames: names(swap.match.teamB),
              }
            : null
        }
        canMoveCourt={free.length >= courtsNeeded(match)}
        onSelectPlayer={openProfile}
        onSwap={notYet}
        onReplacePlayer={notYet}
        onMoveCourt={notYet}
        onSwapWithQueue={notYet}
        onSendBack={notYet}
        onStart={onStart}
        pendingAction={startMatch.isPending ? 'start' : undefined}
        message={message}
        error={error}
      />
      {/* Back to match closes the profile; the sheet underneath stays as it was */}
      <PlayerProfile
        clubPlayerId={profileId}
        onClose={() => setProfileId(null)}
        backLabel="match"
        onBack={() => setProfileId(null)}
      />
    </>
  )
}
