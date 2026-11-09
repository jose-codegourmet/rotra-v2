'use client'

import { useClubPlayers } from '@rotra/data/club-player/useClubPlayers'
import {
  canPlace,
  FORMAT_LABELS,
  type MatchContext,
  nextMatchCandidates,
  shortName,
  waitingMatches,
} from '@rotra/data/match/match.rules'
import { usePlaceOnCourt } from '@rotra/data/match/usePlaceOnCourt'
import { useSessionMatches } from '@rotra/data/match/useSessionMatches'
import { MockError } from '@rotra/data/mock/errors'
import { courtFillModeOf } from '@rotra/data/queue-session/courtFill'
import { useFillOpenedCourts } from '@rotra/data/queue-session/useFillOpenedCourts'
import { useQueueSession } from '@rotra/data/queue-session/useQueueSession'
import { useSessionRoster } from '@rotra/data/session-roster/useSessionRoster'
import { type NextMatchCandidate, NextMatchSheet } from '@rotra/ui/next-match-sheet'
import { profilePictureSrc } from '@rotra/ui/profile-picture'
import { toast } from '@rotra/ui/toaster'
import { useRef, useState } from 'react'

/** The court a confirmed result freed, and the finished match's number */
export type NextMatchRequest = { courtId: string; matchNo: number }

export type NextMatchProps = {
  sessionId: string
  /** null keeps the picker closed */
  request: NextMatchRequest | null
  onClose: () => void
}

const NOT_READY = 'That match is not ready any more. Pick again.'

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong. Try again.'

/** The commit could not be made durable on this device, or offline without a copy */
const isSaveFailure = (error: unknown) =>
  error instanceof MockError && (error.kind === 'retryable' || error.kind === 'offline')

/**
 * Q-NEXT-MATCH: after Confirm result, NextMatchSheet offers up to five ready waiting matches
 * for the freed court (nextMatchCandidates, the readiness check Auto Queue uses). Pick this goes
 * through usePlaceOnCourt (On court, getting ready, never started), rechecked at pick time: a match
 * no longer ready shows "That match is not ready any more. Pick again." and refetches. Skip for now
 * (or closing) places nothing; in Auto Queue the court the result held back is then handed to Auto
 * Queue (useFillOpenedCourts with afterSkip), so it fills exactly as it would have.
 */
export function NextMatch({ sessionId, request, onClose }: NextMatchProps) {
  const clubPlayers = useClubPlayers()
  const session = useQueueSession(sessionId)
  const roster = useSessionRoster(sessionId)
  const matches = useSessionMatches(sessionId)
  const placeOnCourt = usePlaceOnCourt()
  const fillCourt = useFillOpenedCourts()
  const [error, setError] = useState<string | undefined>()
  // One placement per tap: a second tap (or a swipe after a tap) can land before isPending renders.
  const placing = useRef(false)

  const s = session.data
  if (!request || !s || !roster.data || !matches.data) return null
  const { courtId, matchNo } = request

  const ctx: MatchContext = {
    roster: roster.data.roster,
    matches: matches.data,
    courts: s.courts,
    now: Date.now(),
  }
  const court = s.courts.find((c) => c.id === courtId)
  const courtLabel = court?.label ?? 'Court'
  const queue = waitingMatches(ctx.matches)
  const players = (ids: string[], games: Record<string, number>) =>
    ids.map((id) => {
      const p = ctx.roster.find((player) => player.id === id)
      const clubPlayer =
        p && clubPlayers.data?.players.find((player) => player.id === p.clubPlayerId)
      return {
        id,
        name: p?.nameSnapshot ?? 'Player',
        shortName: p ? shortName(p) : 'Player',
        level: p?.level ?? null,
        photoUrl: clubPlayer
          ? profilePictureSrc(
              clubPlayer.picture,
              clubPlayer.playerId ?? clubPlayer.id,
              clubPlayer.pictureName ?? clubPlayer.fullName,
            )
          : undefined,
        games: games[id] ?? 0,
      }
    })
  const candidates: NextMatchCandidate[] = nextMatchCandidates(courtId, ctx).map((m) => ({
    matchId: m.id,
    position: queue.findIndex((q) => q.id === m.id) + 1,
    teamA: players(m.teamA, m.gamesByPlayer),
    teamB: players(m.teamB, m.gamesByPlayer),
    formatLabel: FORMAT_LABELS[m.format],
  }))

  const refresh = () => {
    void session.refetch()
    void roster.refetch()
    void matches.refetch()
  }
  const finish = () => {
    setError(undefined)
    onClose()
  }

  const onPick = (matchId: string) => {
    if (placing.current || placeOnCourt.isPending) return
    const match = ctx.matches.find((m) => m.id === matchId)
    // Recheck on pick: the state may have changed since the cards were drawn.
    if (!match || !canPlace(match, [courtId], ctx)) {
      setError(NOT_READY)
      refresh()
      return
    }
    placing.current = true
    setError(undefined)
    placeOnCourt.mutate(
      { matchId, courtIds: [courtId], operationId: crypto.randomUUID() },
      {
        onSuccess: (result) => {
          toast(result.message)
          finish()
        },
        onError: (failure) => {
          if (failure instanceof MockError && failure.kind === 'conflict') {
            setError(NOT_READY)
            refresh()
            return
          }
          setError(errorMessage(failure))
          if (isSaveFailure(failure)) toast.error(errorMessage(failure))
        },
        onSettled: () => {
          placing.current = false
        },
      },
    )
  }

  const onSkip = () => {
    if (placing.current || placeOnCourt.isPending) return
    finish()
    // Manual Queue: the court stays free. Auto Queue: it fills as it would have without the picker.
    if (courtFillModeOf(s) !== 'auto') return
    fillCourt.mutate(
      { sessionId, courtIds: [courtId], afterSkip: true },
      {
        onSuccess: (result) => {
          if (result.message) toast(result.message)
        },
        onError: (failure) => toast.error(errorMessage(failure)),
      },
    )
  }

  return (
    <NextMatchSheet
      open
      courtLabel={courtLabel}
      matchNo={matchNo}
      candidates={candidates}
      onPick={onPick}
      onSkip={onSkip}
      isPending={placeOnCourt.isPending}
      error={error}
    />
  )
}
