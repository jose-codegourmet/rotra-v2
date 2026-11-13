'use client'

import { useClubPlayers } from '@rotra/data/club-player/useClubPlayers'
import {
  activeMatchFor,
  countedGames,
  courtFreeSince,
  courtMatches,
  courtOpen,
  courtsNeeded,
  FORMAT_LABELS,
  freeCourtMinutes,
  freeCourts,
  isBookingEnded,
  type MatchContext,
  matchStatus,
  nextEligibleForCourt,
  openedEarly,
  shortName,
  shortOnPlayers,
  swapTarget,
  waitingMatches,
  waitMinutes,
} from '@rotra/data/match/match.rules'
import type { Match } from '@rotra/data/match/types'
import { usePlaceOnCourt } from '@rotra/data/match/usePlaceOnCourt'
import { useRemoveWaitingMatch } from '@rotra/data/match/useRemoveWaitingMatch'
import { useSessionMatches } from '@rotra/data/match/useSessionMatches'
import { useStartMatch } from '@rotra/data/match/useStartMatch'
import { courtFillModeOf } from '@rotra/data/queue-session/courtFill'
import type { SessionCourt } from '@rotra/data/queue-session/types'
import { useFillOpenedCourts } from '@rotra/data/queue-session/useFillOpenedCourts'
import { useOpenAllCourtsEarly } from '@rotra/data/queue-session/useOpenAllCourtsEarly'
import { useOpenCourtEarly } from '@rotra/data/queue-session/useOpenCourtEarly'
import { useQueueSession } from '@rotra/data/queue-session/useQueueSession'
import { useRemoveCourt } from '@rotra/data/queue-session/useRemoveCourt'
import { useSetCourtFillMode } from '@rotra/data/queue-session/useSetCourtFillMode'
import { useUndoCourtEarlyOpen } from '@rotra/data/queue-session/useUndoCourtEarlyOpen'
import { useUpdateCourt } from '@rotra/data/queue-session/useUpdateCourt'
import type { SessionPlayer } from '@rotra/data/session-roster/types'
import { useSessionRoster } from '@rotra/data/session-roster/useSessionRoster'
import { courtNextDay } from '@rotra/schema/court-window'
import { AddCourtTile } from '@rotra/ui/add-court-tile'
import { Button } from '@rotra/ui/button'
import { ConfirmSheet } from '@rotra/ui/confirm-sheet'
import { CourtCard, type CourtCardProps } from '@rotra/ui/court-card'
import type { CourtPlayer } from '@rotra/ui/court-drawing'
import { CourtFillSwitch } from '@rotra/ui/court-fill-switch'
import { CourtLabelForm } from '@rotra/ui/forms/court-label-form'
import type { MatchCardPlayer } from '@rotra/ui/match-card'
import { formatTime } from '@rotra/ui/now-card/helpers'
import { profilePictureSrc } from '@rotra/ui/profile-picture'
import { ShortOnPlayersBanner } from '@rotra/ui/short-on-players-banner'
import { Skeleton } from '@rotra/ui/skeleton'
import { toast } from '@rotra/ui/toaster'
import { type UpcomingQueueMatch, UpcomingQueueRow } from '@rotra/ui/upcoming-queue-row'
import { useEffect, useRef, useState } from 'react'
import { QueryError } from '@/app/(operator)/_components/query-error/QueryError'
import { OnCourt } from '@/app/(operator)/sessions/[sessionId]/_components/on-court/OnCourt'

export type SessionViewProps = {
  sessionId: string
  /** The console clock (moves every 30 s): minutes in game and Booking ended are measured against it */
  now: number
  /** A player picture was tapped on a court or a queue card */
  onOpenProfile: (clubPlayerId: string) => void
  /** The More queues tile: switch the console to the Queue view */
  onOpenQueue: () => void
  /** The + Add court tile: open the Add a court sheet (Queue › Courts and time) */
  onAddCourt: () => void
  /** Edit in a court's ⋯ menu: open the Edit court sheet (Queue › Courts and time). Hidden until given. */
  onEditCourt?: (courtId: string) => void
  /** Edit on an upcoming queue card: open the Edit lineup sheet (Queue › Match editing). Edit is hidden until given. */
  onEditMatch?: (matchId: string) => void
  /** Add match on a free court card with nothing to start: open the Add match sheet (Queue › Match editing). Hidden until given. */
  onAddMatch?: () => void
  /**
   * Put on court for a 5v5 on a free court (with that court) or Put on court on an upcoming queue
   * card (no court): open the Put on court sheet (Queue › Match control). A one-court match's Put on
   * court on a free court places it straight away. Hidden until given.
   */
  onStartMatch?: (matchId: string, courtId?: string) => void
  /** Pick another on a free court: open the Start a match on Court X sheet (Queue › Match control). Hidden until given. */
  onPickAnother?: (courtId: string) => void
  /** Open match on a Playing court card: open the active match sheet (Queue › Match control). Hidden until given. A Getting ready card's Open match opens the On court sheet here. */
  onOpenMatch?: (matchId: string) => void
}

/**
 * Q-COURTS, the console's Session view: "Courts" with "F of C free", one CourtCard per court from
 * the match rules in one of three states (Free with the next eligible match or why none can go on,
 * Getting ready for a match On court, Playing), each court face with its game badge, the
 * + Add court tile, the footer line, then UpcomingQueueRow with the whole waiting queue, each name
 * with its wait timer (minutes since the last game, or On court / Playing / Not here) while the
 * session is live.
 * Put on court on a free court places a one-court match straight away (usePlaceOnCourt, "Match N on
 * Court X · getting ready"); a 5v5 opens the Put on court sheet for its second court. Start match on
 * a Getting ready card is one tap (useStartMatch, "Match N started on Court X"); its Open match
 * opens the On court sheet (OnCourt); its ⋯ menu "Swap with #P · Match N" opens the swap sheet
 * directly (OnCourt swapFirst). Pick another, Open match on a Playing court, Add match and
 * Put on court on a queue card are wired by the shell; here the pictures, More queues, Remove on a free court and Remove
 * on a queue card act, Edit appears once onEditMatch is given and a free court's Add match once
 * onAddMatch is given (both Queue › Match editing). Both
 * removes go straight to their mutation with a toast and no dialog (per dialogs.md): a court with
 * "LABEL removed" (an occupied court is refused with "Only a free court can be removed"), a waiting
 * match with "Waiting match N removed".
 * Live sessions show the Manual Queue | Auto Queue switch under the Courts header (useSetCourtFillMode,
 * needs internet) and the ShortOnPlayersBanner above Courts (shortOnPlayers); a court newly open in
 * Auto Queue is filled on the console refresh (useFillOpenedCourts). A busy court past its booked end
 * shows Booking ended on its card.
 * A court before its planned start shows Start anyway, and the header shows Open all courts now while
 * any court is not open yet; both confirm first ("Open Court 4 now?") and then open the court early
 * (useOpenCourtEarly / useOpenAllCourtsEarly). Undo early open in the ⋯ menu goes straight back to
 * Not open yet (useUndoCourtEarlyOpen), only while the court is free.
 */
export function SessionView({
  sessionId,
  now,
  onOpenProfile,
  onOpenQueue,
  onAddCourt,
  onEditCourt,
  onEditMatch,
  onAddMatch,
  onStartMatch,
  onPickAnother,
  onOpenMatch,
}: SessionViewProps) {
  const session = useQueueSession(sessionId)
  const roster = useSessionRoster(sessionId)
  const matches = useSessionMatches(sessionId)
  const clubPlayers = useClubPlayers()
  const removeCourt = useRemoveCourt()
  const removeWaitingMatch = useRemoveWaitingMatch()
  const openCourtEarly = useOpenCourtEarly()
  const openAllCourtsEarly = useOpenAllCourtsEarly()
  const undoEarlyOpen = useUndoCourtEarlyOpen()
  const placeOnCourt = usePlaceOnCourt()
  const startMatch = useStartMatch()
  const setCourtFill = useSetCourtFillMode()
  const fillOpened = useFillOpenedCourts()
  const updateCourt = useUpdateCourt()
  // One placement or start per tap: a second tap can land before isPending reaches this render.
  const committing = useRef(false)
  /** The On court match whose sheet is open (Open match on a Getting ready card) */
  const [onCourtId, setOnCourtId] = useState<string | null>(null)
  /** The court card's ⋯ menu Swap with #P opened the swap sheet directly (Cancel closes it) */
  const [swapFirst, setSwapFirst] = useState(false)
  /** The Start anyway confirmation: one court, or every not-open court (Open all courts now) */
  const [opening, setOpening] = useState<{ courtId: string | null } | null>(null)
  const [openError, setOpenError] = useState<string | undefined>()
  /** The court whose Change court label dialog is open (⋯ menu) */
  const [labelCourtId, setLabelCourtId] = useState<string | null>(null)
  const [labelError, setLabelError] = useState<string | undefined>()
  /** Courts seen open on the last refresh: a court newly open gets Auto Queue's fill (console refresh) */
  const seenOpen = useRef<Set<string> | null>(null)
  const sessionData = session.data
  const openIds = sessionData?.courts
    .filter((c) => !c.removedAt && courtOpen(c, now))
    .map((c) => c.id)
    .join(',')
  const isLive = sessionData?.state === 'active'
  const autoOn = sessionData ? courtFillModeOf(sessionData) === 'auto' : false
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs when the set of open courts changes
  useEffect(() => {
    const ids = new Set(openIds ? openIds.split(',') : [])
    const before = seenOpen.current
    seenOpen.current = ids
    if (!before || !isLive || !autoOn) return
    const opened = [...ids].filter((id) => !before.has(id))
    if (opened.length)
      fillOpened.mutate(
        { sessionId, courtIds: opened },
        { onSuccess: (result) => result.message && toast(result.message) },
      )
  }, [openIds, isLive, autoOn, sessionId])

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
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,250px),1fr))] gap-3">
        <Skeleton className="h-56 rounded-lg" />
        <Skeleton className="h-56 rounded-lg" />
        <Skeleton className="h-56 rounded-lg" />
      </div>
    )

  const courts = s.courts
  const ctx: MatchContext = { roster: roster.data.roster, matches: matches.data, courts, now }
  const byId = (id: string) => ctx.roster.find((p) => p.id === id)
  const clubPlayerOf = (rosterId: string) => byId(rosterId)?.clubPlayerId
  const openProfile = (rosterId: string) => {
    const clubPlayerId = clubPlayerOf(rosterId)
    if (clubPlayerId) onOpenProfile(clubPlayerId)
  }
  const player = (id: string): CourtPlayer => {
    const p: SessionPlayer | undefined = byId(id)
    // The face is the saved player's own picture (or character), like the Queue tab and Next match
    const clubPlayer = p && clubPlayers.data?.players.find((item) => item.id === p.clubPlayerId)
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
    }
  }
  /** A court face: the game badge shows the player's counted games this session */
  const courtPlayer = (id: string): CourtPlayer => ({
    ...player(id),
    games: countedGames(id, ctx.matches),
  })
  const names = (ids: string[]) => ids.map((id) => player(id).shortName)
  const live = s.state === 'active'
  /** A queue face: the wait timer while the session is live (prototype queueCard wait()) */
  const queuePlayer = (id: string): MatchCardPlayer => {
    if (!live) return player(id)
    const p = byId(id)
    const busy = activeMatchFor(id, ctx.matches)
    return {
      ...player(id),
      wait: busy
        ? { kind: busy.state === 'on_court' ? 'on-court' : 'playing' }
        : !p || !p.present
          ? { kind: 'not-here' }
          : { kind: 'minutes', minutes: waitMinutes(p, ctx.matches, s.startedAt, now) },
    }
  }

  const waiting = waitingMatches(ctx.matches)
  const fillMode = courtFillModeOf(s)
  const short = live ? shortOnPlayers(s, ctx) : null
  const onChangeFill = (mode: 'manual' | 'auto') => {
    if (mode === fillMode || setCourtFill.isPending) return
    setCourtFill.mutate({ sessionId, mode }, options)
  }
  const onCourts = courtMatches(ctx.matches)
  const free = freeCourts(courts, ctx.matches, now)
  const untilLabel = (c: SessionCourt) =>
    `${formatTime(c.openUntil ?? s.scheduledEndAt)}${courtNextDay(c.openUntil ?? s.scheduledEndAt, s.scheduledStartAt) ? ' · next day' : ''}`
  const startLabel = (c: SessionCourt) =>
    `${formatTime(c.startsAt ?? s.scheduledStartAt)}${courtNextDay(c.startsAt ?? s.scheduledStartAt, s.scheduledStartAt) ? ' · next day' : ''}`
  const options = {
    onSuccess: (result: { message: string }) => toast(result.message),
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : 'Something went wrong. Try again.'),
  }
  const onRemoveCourt = (c: SessionCourt) => {
    if (removeCourt.isPending) return
    removeCourt.mutate({ sessionId, courtId: c.id }, options)
  }
  const notOpenCourts = courts.filter((c) => !courtOpen(c, now))
  const canOpenCourt = live && notOpenCourts.length > 0
  const startAnyway = (courtId: string | null) => {
    setOpenError(undefined)
    setOpening({ courtId })
  }
  const onConfirmOpen = () => {
    if (!opening || openCourtEarly.isPending || openAllCourtsEarly.isPending) return
    const confirm = {
      onSuccess: (result: { message: string }) => {
        toast(result.message)
        setOpening(null)
      },
      onError: (error: unknown) => {
        const message = error instanceof Error ? error.message : 'Something went wrong. Try again.'
        setOpenError(message)
        toast.error(message)
      },
    }
    if (opening.courtId) openCourtEarly.mutate({ sessionId, courtId: opening.courtId }, confirm)
    else openAllCourtsEarly.mutate({ sessionId }, confirm)
  }
  const onUndoEarlyOpen = (c: SessionCourt) => {
    if (undoEarlyOpen.isPending) return
    undoEarlyOpen.mutate({ sessionId, courtId: c.id }, options)
  }
  /** Change court label: only the label changes; the court's start and end stay as they are. */
  const onSaveLabel = (c: SessionCourt, label: string) => {
    if (updateCourt.isPending) return
    if (label === c.label) {
      setLabelCourtId(null)
      toast('Court label unchanged')
      return
    }
    setLabelError(undefined)
    updateCourt.mutate(
      {
        sessionId,
        courtId: c.id,
        label,
        startsAt: c.startsAt ?? s.startedAt ?? s.scheduledStartAt,
        openUntil: c.openUntil,
      },
      {
        onSuccess: () => {
          setLabelCourtId(null)
          toast(`${c.label} is now ${label}`)
        },
        onError: (error: unknown) =>
          setLabelError(
            error instanceof Error ? error.message : 'Something went wrong. Try again.',
          ),
      },
    )
  }
  const labelCourt = courts.find((c) => c.id === labelCourtId)
  const menuFor = (c: SessionCourt) => ({
    onChangeLabel: () => {
      setLabelError(undefined)
      setLabelCourtId(c.id)
    },
    openedEarly: openedEarly(c, now),
    onEdit: onEditCourt ? () => onEditCourt(c.id) : undefined,
    onUndoEarlyOpen: live && openedEarly(c, now) ? () => onUndoEarlyOpen(c) : undefined,
    onRemove: () => onRemoveCourt(c),
  })
  const onRemoveMatch = (m: Match) => {
    if (removeWaitingMatch.isPending) return
    removeWaitingMatch.mutate({ sessionId, matchId: m.id }, options)
  }
  const commit = {
    ...options,
    onSettled: () => {
      committing.current = false
    },
  }
  /** Put on court on a free court: one court places straight away; a 5v5 needs the sheet for its second court */
  const putOnCourt = (m: Match, courtId: string) => {
    if (courtsNeeded(m) === 2) return onStartMatch?.(m.id, courtId)
    if (committing.current || placeOnCourt.isPending) return
    committing.current = true
    placeOnCourt.mutate(
      { matchId: m.id, courtIds: [courtId], operationId: crypto.randomUUID() },
      commit,
    )
  }
  /** Start match on a Getting ready card: one tap; the owner rechecks presence and busy players */
  const startOnCourt = (m: Match) => {
    if (committing.current || startMatch.isPending) return
    committing.current = true
    startMatch.mutate({ matchId: m.id, courtIds: [], operationId: crypto.randomUUID() }, commit)
  }

  // A 5v5 on two courts draws once, as one merged card, under its first court.
  const covered = new Set<string>()
  const cards: CourtCardProps[] = []
  for (const c of courts) {
    if (covered.has(c.id)) continue
    const m: Match | undefined = onCourts.find((x) => x.courtIds.includes(c.id))
    if (m) {
      const merged = m.courtIds.length > 1
      for (const id of m.courtIds) covered.add(id)
      const base = {
        label: merged
          ? m.courtIds.map((id) => courts.find((x) => x.id === id)?.label ?? 'Court').join(' + ')
          : c.label,
        untilLabel: untilLabel(c),
        startLabel: startLabel(c),
        merged,
        bookingEnded: isBookingEnded(c, s.scheduledEndAt, now),
        teamA: m.teamA.map(courtPlayer),
        teamB: m.teamB.map(courtPlayer),
        onOpenProfile: openProfile,
        formatLabel: FORMAT_LABELS[m.format],
        matchNo: m.matchNo,
        ...menuFor(c),
      }
      if (m.state === 'on_court') {
        const status = matchStatus(m, ctx)
        const swapWith = swapTarget(m, ctx)
        cards.push({
          ...base,
          variant: 'on-court',
          blockedReason: status.kind === 'ready' ? undefined : status.reason,
          onStartMatch: () => startOnCourt(m),
          onOpenMatch: () => {
            setSwapFirst(false)
            setOnCourtId(m.id)
          },
          onSwap: () => {
            setSwapFirst(true)
            setOnCourtId(m.id)
          },
          swapWith: swapWith
            ? { position: swapWith.position, matchNo: swapWith.match.matchNo }
            : null,
        })
        continue
      }
      cards.push({
        ...base,
        variant: 'in-game',
        minutes: Math.max(0, Math.round((now - (m.startedAt ?? now)) / 60000)),
        substitutions: m.substitutions.length,
        onOpenMatch: onOpenMatch ? () => onOpenMatch(m.id) : undefined,
      })
      continue
    }
    const next = nextEligibleForCourt(c.id, ctx, s)
    const eligible = next.match
    const first = waiting[0]
    cards.push({
      variant: 'free',
      label: c.label,
      untilLabel: untilLabel(c),
      startLabel: startLabel(c),
      notOpen: !courtOpen(c, now),
      // "Free · N min": since the last match on it ended, or since the court opened / the session started.
      freeMinutes: live
        ? freeCourtMinutes(
            courtFreeSince(c.id, ctx.matches, now) ??
              Math.max(c.openedEarlyAt ?? c.startsAt ?? 0, s.startedAt ?? 0),
            now,
          )
        : null,
      onStartAnyway: live && !courtOpen(c, now) ? () => startAnyway(c.id) : undefined,
      bookingEnded: isBookingEnded(c, s.scheduledEndAt, now),
      isLastCourt: courts.length <= 1,
      ...menuFor(c),
      next: next.match
        ? {
            skippedReason: next.skipped ?? undefined,
            position: waiting.indexOf(next.match) + 1,
            formatLabel: FORMAT_LABELS[next.match.format],
            teamA: names(next.match.teamA),
            teamB: names(next.match.teamB),
          }
        : null,
      notEnoughFreePlayers: next.notEnoughFreePlayers,
      blockedReason: !next.match && first ? matchStatus(first, ctx).reason : undefined,
      onPutOnCourt:
        eligible && (courtsNeeded(eligible) === 1 || onStartMatch)
          ? () => putOnCourt(eligible, c.id)
          : undefined,
      onPickAnother:
        eligible && waiting.length > 1 && onPickAnother ? () => onPickAnother(c.id) : undefined,
      onAddMatch,
    })
  }

  const upcoming: UpcomingQueueMatch[] = waiting.map((m, i) => ({
    position: i + 1,
    matchNo: m.matchNo,
    format: m.format,
    origin: m.origin,
    manualProtected: m.manualProtected,
    status: matchStatus(m, ctx),
    teamA: m.teamA.map(queuePlayer),
    teamB: m.teamB.map(queuePlayer),
    onSelectPlayer: openProfile,
    onStart: onStartMatch ? () => onStartMatch(m.id) : undefined,
    canOpenCourt,
    onEdit: onEditMatch ? () => onEditMatch(m.id) : undefined,
    onRemove: () => onRemoveMatch(m),
  }))
  const attentionCount = upcoming.filter((m) => m.status.kind === 'needs-attention').length

  return (
    <>
      {short ? <ShortOnPlayersBanner {...short} /> : null}
      <section aria-label="Courts" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold">Courts</h2>
          <div className="flex flex-wrap items-center gap-2.5">
            {live && notOpenCourts.length ? (
              <Button size="xs" onClick={() => startAnyway(null)}>
                Open all courts now
              </Button>
            ) : null}
            <span className="text-[13px] text-fg2">
              {free.length} of {courts.length} free
            </span>
          </div>
        </div>
        {live ? <CourtFillSwitch value={fillMode} onChange={onChangeFill} /> : null}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,250px),1fr))] gap-3">
          {cards.map((card) => (
            <CourtCard key={card.label} {...card} />
          ))}
          <AddCourtTile nextNumber={courts.length + 1} onAdd={onAddCourt} />
        </div>
        <p className="text-[13px] text-fg2">
          A match never starts by itself when a court frees up. You start each one.
        </p>
      </section>
      <UpcomingQueueRow
        matches={upcoming}
        attentionCount={attentionCount}
        onOpenQueue={onOpenQueue}
        className="border-t border-border pt-5"
      />
      <OpenEarlySheet
        courts={
          opening?.courtId
            ? courts.filter((c) => c.id === opening.courtId)
            : opening
              ? notOpenCourts
              : []
        }
        startLabel={startLabel}
        open={!!opening}
        onOpenChange={(next) => {
          if (!next) setOpening(null)
        }}
        onConfirm={onConfirmOpen}
        isPending={openCourtEarly.isPending || openAllCourtsEarly.isPending}
        error={openError}
      />
      {labelCourt ? (
        <CourtLabelForm
          key={labelCourt.id}
          open
          onOpenChange={(next) => {
            if (!next) setLabelCourtId(null)
          }}
          currentLabel={labelCourt.label}
          otherLabels={courts
            .filter((c) => c.id !== labelCourt.id && !c.removedAt)
            .map((c) => c.label)}
          onSubmit={({ label }) => onSaveLabel(labelCourt, label)}
          isPending={updateCourt.isPending}
          serverError={labelError}
        />
      ) : null}
      <OnCourt
        sessionId={sessionId}
        now={now}
        matchId={onCourtId}
        swapFirst={swapFirst}
        onClose={() => {
          setOnCourtId(null)
          setSwapFirst(false)
        }}
      />
    </>
  )
}

/** "Open Court 4 now?" / "Open all courts now?": the Start anyway confirmation */
function OpenEarlySheet({
  courts,
  startLabel,
  open,
  onOpenChange,
  onConfirm,
  isPending,
  error,
}: {
  courts: SessionCourt[]
  startLabel: (c: SessionCourt) => string
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  isPending: boolean
  error?: string
}) {
  const one = courts.length === 1 ? courts[0] : undefined
  return (
    <ConfirmSheet
      open={open}
      onOpenChange={onOpenChange}
      title={one ? `Open ${one.label} now?` : 'Open all courts now?'}
      summary={
        one ? (
          <p className="m-0">It's booked from {startLabel(one)}.</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-1 p-0 text-[13px]">
            {courts.map((c) => (
              <li key={c.id}>
                {c.label} <span className="text-fg2">· booked from {startLabel(c)}</span>
              </li>
            ))}
          </ul>
        )
      }
      consequence={`Opening early makes ${one ? 'it' : 'them'} available for matches now.`}
      note="The booking time and costs don't change."
      confirmLabel="Open now"
      backLabel="Cancel"
      onConfirm={onConfirm}
      isPending={isPending}
      error={error}
    />
  )
}
