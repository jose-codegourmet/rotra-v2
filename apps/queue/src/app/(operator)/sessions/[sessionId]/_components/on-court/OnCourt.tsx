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
  substitutionCandidates,
  swapTarget,
  waitMinutes,
} from '@rotra/data/match/match.rules'
import type { Match } from '@rotra/data/match/types'
import { useMoveCourt } from '@rotra/data/match/useMoveCourt'
import { useReplacePlayer } from '@rotra/data/match/useReplacePlayer'
import { useSendBackToQueue } from '@rotra/data/match/useSendBackToQueue'
import { useSessionMatches } from '@rotra/data/match/useSessionMatches'
import { useStartMatch } from '@rotra/data/match/useStartMatch'
import { useSwapWithQueue } from '@rotra/data/match/useSwapWithQueue'
import { MockError } from '@rotra/data/mock/errors'
import type { QueueSession } from '@rotra/data/queue-session/types'
import { useQueueSession } from '@rotra/data/queue-session/useQueueSession'
import type { SessionPlayer } from '@rotra/data/session-roster/types'
import { useSessionRoster } from '@rotra/data/session-roster/useSessionRoster'
import { MoveMatchSheet } from '@rotra/ui/move-match-sheet'
import { formatWhen } from '@rotra/ui/now-card/helpers'
import { OnCourtSheet } from '@rotra/ui/on-court-sheet'
import { ReplacePlayerSheet } from '@rotra/ui/replace-player-sheet'
import { SwapMatchSheet } from '@rotra/ui/swap-match-sheet'
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
  /**
   * Open straight on Swap match N with #P? (the court card's ⋯ menu "Swap with #P · Match N"): its
   * back action reads Cancel and closes everything instead of returning to the On court sheet.
   */
  swapFirst?: boolean
  onClose: () => void
}

const CHANGED = 'Something changed. Review the match again.'

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong. Try again.'

/** The recheck at Start match refused the start: the sheet stays open with refreshed data */
const isRecheckFailure = (error: unknown) => error instanceof MockError && error.kind === 'conflict'

/**
 * Q-ON-COURT: OnCourtSheet for a match On court (placed, not started), opened by Open match on a
 * Getting ready court card, plus the sheets it opens. Start match is one tap on useStartMatch with
 * the held court(s): the owner rechecks presence and busy players, success toasts "Match N started
 * on Court X" and closes; "Something changed. Review the match again." toasts, stays open and
 * refetches. A local save failure is an error toast and an error inside the sheet, and the action
 * retries the same operationId. A Start match block reason (a player not present or busy) comes
 * from matchStatus.
 * Send back to queue (useSendBackToQueue) toasts "Match N back to #1 in the queue · Court X free"
 * and closes. Replace player (ReplacePlayerSheet, useReplacePlayer) is a plain lineup change and
 * Move to another court (MoveMatchSheet, useMoveCourt) keeps the match getting ready on the new
 * court: both toast and return to the On court sheet. Swap with #P opens SwapMatchSheet (Back to
 * match) on useSwapWithQueue, which rechecks that the same match is still next; success toasts
 * "Match M swapped onto Court X · getting ready · Match N back to #P in the queue" and closes.
 * The court card's ⋯ menu opens the same swap sheet directly (`swapFirst`, Cancel).
 * Player cards open PlayerProfile with Back to match. The sheet closes by itself once the match is
 * no longer On court (started, sent back, swapped out or changed elsewhere).
 */
export function OnCourt({ sessionId, now, matchId, swapFirst = false, onClose }: OnCourtProps) {
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

  const ctx: MatchContext = {
    roster: roster.data.roster,
    matches: matches.data,
    courts: s.courts,
    now,
  }
  const refresh = () => {
    void session.refetch()
    void roster.refetch()
    void matches.refetch()
  }

  return (
    // Remounted per match so the operationIds and messages start fresh for each open
    <OpenOnCourt
      key={match.id}
      session={s}
      match={match}
      ctx={ctx}
      swapFirst={swapFirst}
      onClose={onClose}
      onRefresh={refresh}
    />
  )
}

type OpenOnCourtProps = {
  session: QueueSession
  match: Match
  ctx: MatchContext
  swapFirst: boolean
  onClose: () => void
  onRefresh: () => void
}

/** Which sheet is showing: the On court sheet, or one of the sheets it opens */
type View = 'match' | 'replace' | 'move' | 'swap'

/** What the mutations report back to the action that started them */
type Callbacks = {
  onSuccess: (result: { message: string }) => void
  onError: (error: unknown) => void
  onSettled: () => void
}

function OpenOnCourt({ session, match, ctx, swapFirst, onClose, onRefresh }: OpenOnCourtProps) {
  const startMatch = useStartMatch()
  const sendBack = useSendBackToQueue()
  const moveCourt = useMoveCourt()
  const replacePlayer = useReplacePlayer()
  const swapWithQueue = useSwapWithQueue()
  const [view, setView] = useState<View>(swapFirst ? 'swap' : 'match')
  const [moveIds, setMoveIds] = useState<string[]>([])
  const [outId, setOutId] = useState<string | null>(null)
  const [inId, setInId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | undefined>()
  const [error, setError] = useState<string | undefined>()
  const [profileId, setProfileId] = useState<string | null>(null)
  // One operationId per attempt: a retry after a save failure reuses it; a different choice gets
  // its own key, and a finished action forgets it.
  const operationIds = useRef<Record<string, string>>({})
  const operationId = (key: string) => {
    operationIds.current[key] ??= crypto.randomUUID()
    return operationIds.current[key]
  }
  // One action at a time: a second tap can land before isPending reaches this render.
  const acting = useRef(false)

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
  const now = ctx.now ?? Date.now()
  const status = matchStatus(match, ctx)
  const swap = swapTarget(match, ctx)
  const free = freeCourts(ctx.courts, ctx.matches, now)
  const courtLabel = courtNames(match, ctx.courts)
  const needed = courtsNeeded(match) === 2 ? 2 : 1
  // The queue moved on while the swap sheet was open: there is no next match to swap with any more.
  const shown: View = view === 'swap' && !swap ? 'match' : view

  const go = (next: View) => {
    setMessage(undefined)
    setError(undefined)
    setView(next)
  }
  /** Back / dismiss on a sheet the On court sheet opened (a menu-opened swap closes everything) */
  const backToMatch = () => {
    if (swapFirst && shown === 'swap') onClose()
    else go('match')
  }

  /**
   * Runs one command: success toasts the owner's message and hands over to `done`; a recheck
   * failure toasts, keeps the sheet open with "Something changed" and refetches; a local save
   * failure is an error toast and an error in the sheet (nothing was written, so the same
   * operationId retries).
   */
  const run = (key: string, start: (callbacks: Callbacks) => void, done: () => void) => {
    if (acting.current) return
    acting.current = true
    setMessage(undefined)
    setError(undefined)
    start({
      onSuccess: (result) => {
        delete operationIds.current[key]
        toast(result.message)
        done()
      },
      onError: (failure) => {
        toast.error(errorMessage(failure))
        if (isRecheckFailure(failure)) {
          setMessage(CHANGED)
          onRefresh()
        } else {
          setError(errorMessage(failure))
        }
      },
      onSettled: () => {
        acting.current = false
      },
    })
  }

  const onStart = () =>
    run(
      'start',
      (callbacks) =>
        startMatch.mutate(
          { matchId: match.id, courtIds: [], operationId: operationId('start') },
          callbacks,
        ),
      onClose,
    )

  const onSendBack = () =>
    run(
      'send-back',
      (callbacks) =>
        sendBack.mutate({ matchId: match.id, operationId: operationId('send-back') }, callbacks),
      onClose,
    )

  const onConfirmMove = () => {
    if (moveIds.length !== needed) return
    const key = `move:${[...moveIds].sort().join(',')}`
    run(
      key,
      (callbacks) =>
        moveCourt.mutate(
          { matchId: match.id, courtIds: moveIds, operationId: operationId(key) },
          callbacks,
        ),
      () => {
        setMoveIds([])
        go('match')
      },
    )
  }

  const onConfirmReplace = () => {
    if (!outId || !inId) return
    const key = `replace:${outId}:${inId}`
    run(
      key,
      (callbacks) =>
        replacePlayer.mutate(
          { matchId: match.id, outId, inId, operationId: operationId(key) },
          callbacks,
        ),
      () => {
        setOutId(null)
        setInId(null)
        go('match')
      },
    )
  }

  const onConfirmSwap = () => {
    if (!swap) return
    const key = `swap:${swap.match.id}`
    run(
      key,
      (callbacks) =>
        swapWithQueue.mutate(
          { matchId: match.id, withMatchId: swap.match.id, operationId: operationId(key) },
          callbacks,
        ),
      onClose,
    )
  }

  const openProfile = (rosterId: string) => {
    const clubPlayerId = byId(rosterId)?.clubPlayerId
    if (clubPlayerId) setProfileId(clubPlayerId)
  }

  const replaceTile = (id: string) => {
    const p = byId(id)
    return {
      id,
      name: p?.nameSnapshot ?? 'Player',
      level: p?.level ?? null,
      games: countedGames(id, ctx.matches),
      restMinutes: p ? waitMinutes(p, ctx.matches, session.startedAt, now) : 0,
    }
  }
  const swapFace = (id: string) => {
    const p = byId(id)
    return {
      id,
      name: p?.nameSnapshot ?? 'Player',
      shortName: p ? shortName(p) : 'Player',
      games: countedGames(id, ctx.matches),
      waitMinutes: p ? waitMinutes(p, ctx.matches, session.startedAt, now) : 0,
    }
  }
  const swapLineup = (m: Match) => ({
    matchNo: m.matchNo,
    teamA: m.teamA.map(swapFace),
    teamB: m.teamB.map(swapFace),
  })

  const startPending = startMatch.isPending
  const sendBackPending = sendBack.isPending

  return (
    <>
      {shown === 'match' ? (
        <OnCourtSheet
          open
          onOpenChange={(open) => {
            if (!open) onClose()
          }}
          matchNo={match.matchNo}
          courtLabel={courtLabel}
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
          // Switching sides on an On court match has no command yet (swapPlayers takes waiting
          // matches only), so dragging does nothing until one exists.
          onSwap={() => {}}
          onReplacePlayer={() => {
            setOutId(null)
            setInId(null)
            go('replace')
          }}
          onMoveCourt={() => {
            setMoveIds([])
            go('move')
          }}
          onSwapWithQueue={() => go('swap')}
          onSendBack={onSendBack}
          onStart={onStart}
          pendingAction={startPending ? 'start' : sendBackPending ? 'send-back' : undefined}
          message={message}
          error={error}
        />
      ) : null}
      {shown === 'replace' ? (
        <ReplacePlayerSheet
          open
          onOpenChange={(open) => {
            if (!open) backToMatch()
          }}
          matchNo={match.matchNo}
          inMatch={[
            ...match.teamA.map((id) => ({
              ...replaceTile(id),
              team: 'A' as const,
              present: byId(id)?.present ?? false,
            })),
            ...match.teamB.map((id) => ({
              ...replaceTile(id),
              team: 'B' as const,
              present: byId(id)?.present ?? false,
            })),
          ]}
          candidates={substitutionCandidates(match, ctx.roster, ctx.matches).map((p) =>
            replaceTile(p.id),
          )}
          minimumGames={session.minimumGames}
          outId={outId}
          inId={inId}
          onPickOut={setOutId}
          onPickIn={setInId}
          onBack={backToMatch}
          onConfirm={onConfirmReplace}
          isPending={replacePlayer.isPending}
          message={message}
          error={error}
        />
      ) : null}
      {shown === 'move' ? (
        <MoveMatchSheet
          open
          onOpenChange={(open) => {
            if (!open) backToMatch()
          }}
          matchNo={match.matchNo}
          currentLabel={courtLabel}
          courts={free.map((c) => ({ id: c.id, label: c.label }))}
          required={needed}
          value={moveIds}
          onChange={setMoveIds}
          onBack={backToMatch}
          onConfirm={onConfirmMove}
          isPending={moveCourt.isPending}
          message={message}
          error={error}
        />
      ) : null}
      {shown === 'swap' && swap ? (
        <SwapMatchSheet
          open
          onOpenChange={(open) => {
            if (!open) backToMatch()
          }}
          courtLabel={courtLabel}
          current={swapLineup(match)}
          incoming={swapLineup(swap.match)}
          position={swap.position}
          minimumGames={session.minimumGames}
          fromMatch={!swapFirst}
          onBack={backToMatch}
          onConfirm={onConfirmSwap}
          isPending={swapWithQueue.isPending}
          message={message}
          error={error}
        />
      ) : null}
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
