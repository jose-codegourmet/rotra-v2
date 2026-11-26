'use client'

import { useClubPlayers } from '@rotra/data/club-player/useClubPlayers'
import {
  countedGames,
  courtOpen,
  courtsNeeded,
  freeCourts,
  type MatchContext,
  matchStatus,
  queueMasterName,
  waitingMatches,
} from '@rotra/data/match/match.rules'
import { matchCategoryFor } from '@rotra/data/match/matchCategory.rules'
import type { Match } from '@rotra/data/match/types'
import { usePlaceOnCourt } from '@rotra/data/match/usePlaceOnCourt'
import { useSessionMatches } from '@rotra/data/match/useSessionMatches'
import { useSwapPlayers } from '@rotra/data/match/useSwapPlayers'
import { MockError } from '@rotra/data/mock/errors'
import type { QueueSession } from '@rotra/data/queue-session/types'
import { useOpenCourtEarly } from '@rotra/data/queue-session/useOpenCourtEarly'
import { useQueueSession } from '@rotra/data/queue-session/useQueueSession'
import type { SessionPlayer } from '@rotra/data/session-roster/types'
import { useSessionRoster } from '@rotra/data/session-roster/useSessionRoster'
import { type ChooseMatchItem, ChooseMatchSheet } from '@rotra/ui/choose-match-sheet'
import type { MatchCardPlayer } from '@rotra/ui/match-card'
import { formatTime } from '@rotra/ui/now-card/helpers'
import { profilePictureSrc } from '@rotra/ui/profile-picture'
import { StartMatchSheet } from '@rotra/ui/start-match-sheet'
import type { SwapSlot } from '@rotra/ui/swap-sides-area'
import type { TeamLineupPlayer } from '@rotra/ui/team-lineup'
import { toast } from '@rotra/ui/toaster'
import { useRef, useState } from 'react'
import { PlayerProfile } from '@/app/(operator)/sessions/[sessionId]/_components/player-profile/PlayerProfile'
import { useNow } from '@/lib/useNow'

/**
 * What opened the sheets: Put on court for a waiting match (a 5v5's Put on court on a free court
 * names that court, Put on court on a queue card leaves it to the first free court, a 5v5's Start
 * here names the court picked another for), or Pick another on a free court.
 */
export type StartMatchRequest =
  | { mode: 'start'; matchId: string; courtId?: string }
  | { mode: 'choose'; courtId: string }

export type StartMatchProps = {
  sessionId: string
  /** The open request; null keeps both sheets closed */
  request: StartMatchRequest | null
  /** Put on court on a 5v5 in Put a match on Court N: the shell replaces the request with the Put on court one */
  onRequestChange: (request: StartMatchRequest) => void
  /** Edit on a card in Put a match on Court N: the shell opens the lineup editor for that match */
  onEditMatch: (matchId: string) => void
  /** ×, Escape, the scrim and ← Back: one level back (Court N is free), or closed when first */
  onClose: () => void
  /** The match was put on court: the shell closes the whole stack */
  onDone: () => void
}

const CHANGED = 'Something changed. Review the match again.'

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong. Try again.'

/** The recheck at confirmation refused the start: the sheet stays open with refreshed data */
const isRecheckFailure = (error: unknown) => error instanceof MockError && error.kind === 'conflict'
/**
 * Q-DISPATCH / D-START-MATCH (Put match N on court) and Q-CHOOSE-MATCH: StartMatchSheet on
 * usePlaceOnCourt for a waiting match, opened from Put on court on a queue card (the first free
 * court), or for a 5v5 from Put on court on a free court or Start here in ChooseMatchSheet (that
 * court, plus a second free court). A one-court match's Start here puts it on that court straight
 * away, as the prototype's placeOnCourt does. Nothing starts here: the match goes On court
 * (getting ready) and is started from its court card or the On court sheet.
 * Each open gets a fresh operationId, so repeated taps cannot place twice. Success toasts
 * "Match N on Court X · getting ready" (offline: " · Saved on this device, waiting to sync") and
 * closes; "Something changed. Review the match again." toasts, stays open and refetches the session,
 * roster and matches so the sheet shows what changed. A local save failure ("Changes could not be
 * saved") is an error toast and an error inside the sheet: the match stays waiting, the chosen
 * courts stay chosen and Put on court retries the same operationId.
 * Courts before their planned start are listed under "Not open yet": Start anyway calls
 * useOpenCourtEarly ("Court 4 opened early · planned HH:MM") and chooses that court.
 * Switching sides calls useSwapPlayers (the waiting match becomes protected, toast as in the Queue
 * view); a player card opens PlayerProfile with Back to match, which returns to the same sheet.
 * No match is ever put on court without this confirmation or an explicit Put on court tap.
 */
export function StartMatch({
  sessionId,
  request,
  onRequestChange,
  onEditMatch,
  onClose,
  onDone,
}: StartMatchProps) {
  const now = useNow(1000, false, true)
  const session = useQueueSession(sessionId)
  const roster = useSessionRoster(sessionId)
  const matches = useSessionMatches(sessionId)

  const s = session.data
  if (!request || !s || !roster.data || !matches.data) return null

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

  if (request.mode === 'choose')
    return (
      <ChooseMatch
        courtId={request.courtId}
        ctx={ctx}
        onClose={onClose}
        onDone={onDone}
        onOpenPutOnCourt={(matchId) =>
          onRequestChange({ mode: 'start', matchId, courtId: request.courtId })
        }
        onEditMatch={onEditMatch}
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
      onDone={onDone}
      onRefresh={refresh}
    />
  )
}

type ChooseMatchProps = {
  courtId: string
  ctx: MatchContext
  onClose: () => void
  onDone: () => void
  /** A 5v5 needs a second court, so it goes through the Put on court sheet */
  onOpenPutOnCourt: (matchId: string) => void
  /** Edit: the shell opens the lineup editor for that waiting match */
  onEditMatch: (matchId: string) => void
}

/**
 * Q-CHOOSE-MATCH, Put a match on Court N: every waiting match as a compact MatchCard in a carousel,
 * Put on Court N on the ready ones and Edit. A one-court match goes straight on this court
 * (usePlaceOnCourt, "Match N on Court X · getting ready"); a 5v5 opens the Put on court sheet for
 * its second court. Putting one on court closes the whole stack; ×, Escape, the scrim and ← Back
 * call onClose (one level back to Court N is free, or closed when Pick another opened this).
 */
function ChooseMatch({
  courtId,
  ctx,
  onClose,
  onDone,
  onOpenPutOnCourt,
  onEditMatch,
}: ChooseMatchProps) {
  const placeOnCourt = usePlaceOnCourt()
  const clubPlayers = useClubPlayers()
  const [profileId, setProfileId] = useState<string | null>(null)
  // One placement per tap: a second tap can land before isPending reaches this render.
  const placing = useRef(false)
  const court = ctx.courts.find((c) => c.id === courtId)
  const onPutOnCourt = (matchId: string) => {
    const match = ctx.matches.find((m) => m.id === matchId)
    if (!match) return
    if (courtsNeeded(match) === 2) return onOpenPutOnCourt(matchId)
    if (placing.current || placeOnCourt.isPending) return
    placing.current = true
    placeOnCourt.mutate(
      { matchId, courtIds: [courtId], operationId: crypto.randomUUID() },
      {
        onSuccess: (result) => {
          toast(result.message)
          onDone()
        },
        onError: (failure) => toast.error(errorMessage(failure)),
        onSettled: () => {
          placing.current = false
        },
      },
    )
  }
  const player = (id: string): MatchCardPlayer => {
    const p = ctx.roster.find((item) => item.id === id)
    const clubPlayer = p && clubPlayers.data?.players.find((item) => item.id === p.clubPlayerId)
    return {
      id,
      name: p?.nameSnapshot ?? 'Player',
      shortName: p ? queueMasterName(p) : 'Player',
      level: p?.level ?? null,
      photoUrl: clubPlayer
        ? profilePictureSrc(
            clubPlayer.picture,
            clubPlayer.playerId ?? clubPlayer.id,
            clubPlayer.pictureName ?? clubPlayer.fullName,
          )
        : undefined,
    }
  }
  // Start anyway in the Put on court sheet can open a court that is not open yet.
  const canOpenCourt = ctx.courts.some((c) => !c.removedAt && !courtOpen(c, ctx.now))
  const openProfile = (rosterId: string) => {
    const clubPlayerId = ctx.roster.find((p) => p.id === rosterId)?.clubPlayerId
    if (clubPlayerId) setProfileId(clubPlayerId)
  }
  const matches: ChooseMatchItem[] = waitingMatches(ctx.matches).map((m, i) => ({
    matchId: m.id,
    position: i + 1,
    matchNo: m.matchNo,
    format: m.format,
    categoryPrefix: matchCategoryFor(m, ctx.roster),
    origin: m.origin,
    manualProtected: m.manualProtected,
    status: matchStatus(m, ctx),
    teamA: m.teamA.map(player),
    teamB: m.teamB.map(player),
    canOpenCourt,
    onSelectPlayer: openProfile,
  }))
  return (
    <>
      <ChooseMatchSheet
        open
        onOpenChange={(open) => {
          if (!open) onClose()
        }}
        courtLabel={court?.label ?? 'Court'}
        matches={matches}
        onPutOnCourt={onPutOnCourt}
        onEdit={onEditMatch}
        onBack={onClose}
      />
      <PlayerProfile
        clubPlayerId={profileId}
        onClose={() => setProfileId(null)}
        backLabel="match"
        onBack={() => setProfileId(null)}
      />
    </>
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
  onDone: () => void
  /** The recheck refused the start: refetch so the sheet shows the current players and courts */
  onRefresh: () => void
}

/** Prototype openDispatch: the opening court first (or the first free one), plus one more for 5v5 */
function preselect(match: Match, courtId: string | undefined, ctx: MatchContext) {
  const free = freeCourts(ctx.courts, ctx.matches, ctx.now).map((c) => c.id)
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
  onDone,
  onRefresh,
}: OpenStartMatchProps) {
  const placeOnCourt = usePlaceOnCourt()
  const swapPlayers = useSwapPlayers()
  const openCourtEarly = useOpenCourtEarly()
  const [operationId] = useState(() => crypto.randomUUID())
  const [courtIds, setCourtIds] = useState(() => preselect(match, courtId, ctx))
  const [message, setMessage] = useState<string | undefined>()
  const [error, setError] = useState<string | undefined>()
  const [profileId, setProfileId] = useState<string | null>(null)
  // One placement per attempt: a second tap can land before isPending reaches this render.
  const placing = useRef(false)

  const byId = (id: string) => ctx.roster.find((p) => p.id === id)
  const clubPlayers = useClubPlayers()
  /** The face is the saved player's own picture (or character), like the Queue tab */
  const photoOf = (p: SessionPlayer | undefined) => {
    const clubPlayer = p && clubPlayers.data?.players.find((item) => item.id === p.clubPlayerId)
    return clubPlayer
      ? profilePictureSrc(
          clubPlayer.picture,
          clubPlayer.playerId ?? clubPlayer.id,
          clubPlayer.pictureName ?? clubPlayer.fullName,
        )
      : undefined
  }
  const player = (id: string): TeamLineupPlayer => {
    const p: SessionPlayer | undefined = byId(id)
    return {
      id,
      name: p?.nameSnapshot ?? 'Player',
      shortName: p ? queueMasterName(p) : 'Player',
      level: p?.level ?? null,
      games: countedGames(id, ctx.matches),
      photoUrl: photoOf(p),
    }
  }
  const free = freeCourts(ctx.courts, ctx.matches, ctx.now).map((c) => ({
    id: c.id,
    label: c.label,
  }))
  const status = matchStatus(match, ctx)
  const notOpen = ctx.courts
    .filter((c) => !c.removedAt && !courtOpen(c, ctx.now))
    .map((c) => ({
      id: c.id,
      label: c.label,
      opensLabel: formatTime(c.startsAt ?? session.scheduledStartAt),
    }))

  const onStartAnyway = (courtId: string) => {
    if (openCourtEarly.isPending || placeOnCourt.isPending) return
    openCourtEarly.mutate(
      { sessionId, courtId },
      {
        onSuccess: (result) => {
          toast(result.message)
          setCourtIds((ids) =>
            courtsNeeded(match) === 1
              ? [courtId]
              : [...ids.filter((id) => id !== courtId), courtId].slice(-2),
          )
          onRefresh()
        },
        onError: (failure) => toast.error(errorMessage(failure)),
      },
    )
  }

  const onSwap = (from: SwapSlot, to: SwapSlot) => {
    if (from.team === to.team || swapPlayers.isPending || placeOnCourt.isPending) return
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
    if (placing.current || placeOnCourt.isPending) return
    placing.current = true
    setMessage(undefined)
    setError(undefined)
    placeOnCourt.mutate(
      { matchId: match.id, courtIds, operationId },
      {
        onSuccess: (result) => {
          toast(result.message)
          onDone()
        },
        onError: (failure) => {
          toast.error(errorMessage(failure))
          if (isRecheckFailure(failure)) {
            setMessage(CHANGED)
            onRefresh()
          } else {
            // A save failure wrote nothing: the match is still waiting and the courts stay chosen,
            // so Put on court retries the same operationId.
            setError(errorMessage(failure))
          }
        },
        onSettled: () => {
          placing.current = false
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
        notOpenCourts={notOpen}
        onStartAnyway={onStartAnyway}
        isOpeningCourt={openCourtEarly.isPending}
        courtIds={courtIds}
        onCourtIdsChange={setCourtIds}
        onSelectPlayer={openProfile}
        onSwap={onSwap}
        onBack={onClose}
        onStart={onStart}
        isPending={placeOnCourt.isPending}
        message={message}
        error={error}
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
