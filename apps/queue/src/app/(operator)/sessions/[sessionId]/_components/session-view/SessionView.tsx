'use client'

import {
  activeMatches,
  FORMAT_LABELS,
  freeCourts,
  isBookingEnded,
  type MatchContext,
  matchStatus,
  nextEligibleForCourt,
  shortName,
  waitingMatches,
} from '@rotra/data/match/match.rules'
import type { Match } from '@rotra/data/match/types'
import { useRemoveWaitingMatch } from '@rotra/data/match/useRemoveWaitingMatch'
import { useSessionMatches } from '@rotra/data/match/useSessionMatches'
import type { SessionCourt } from '@rotra/data/queue-session/types'
import { useQueueSession } from '@rotra/data/queue-session/useQueueSession'
import { useRemoveCourt } from '@rotra/data/queue-session/useRemoveCourt'
import type { SessionPlayer } from '@rotra/data/session-roster/types'
import { useSessionRoster } from '@rotra/data/session-roster/useSessionRoster'
import { AddCourtTile } from '@rotra/ui/add-court-tile'
import { CourtCard, type CourtCardProps } from '@rotra/ui/court-card'
import type { CourtPlayer } from '@rotra/ui/court-drawing'
import { formatTime } from '@rotra/ui/now-card/helpers'
import { Skeleton } from '@rotra/ui/skeleton'
import { toast } from '@rotra/ui/toaster'
import { UpcomingQueueRow, type UpcomingQueueMatch } from '@rotra/ui/upcoming-queue-row'
import { QueryError } from '@/app/(operator)/_components/query-error/QueryError'

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
  /** Edit on an upcoming queue card: open the Edit lineup sheet (Queue › Match editing). Edit is hidden until given. */
  onEditMatch?: (matchId: string) => void
  /** Add match on a free court card with nothing to start: open the Add match sheet (Queue › Match editing). Hidden until given. */
  onAddMatch?: () => void
  /** Review and start on a free court (with that court) or Start on an upcoming queue card (no court): open the Start match sheet (Queue › Match control). Hidden until given. */
  onStartMatch?: (matchId: string, courtId?: string) => void
  /** Pick another on a free court: open the Start a match on Court X sheet (Queue › Match control). Hidden until given. */
  onPickAnother?: (courtId: string) => void
  /** Open match on an in-game court card: open the active match sheet (Queue › Match control). Hidden until given. */
  onOpenMatch?: (matchId: string) => void
}

/**
 * Q-COURTS, the console's Session view: "Courts" with "F of C free", one CourtCard per court from
 * the match rules (in game, or free with the next eligible match or why none can start), the
 * + Add court tile, the footer line, then UpcomingQueueRow with the whole waiting queue. The court
 * actions (Review and start, Pick another, Open match, Add match) and Start on a queue card are
 * wired by Queue › Match control; here the pictures, More queues, Remove on a free court and Remove
 * on a queue card act, Edit appears once onEditMatch is given and a free court's Add match once
 * onAddMatch is given (both Queue › Match editing). Both
 * removes go straight to their mutation with a toast and no dialog (per dialogs.md): a court with
 * "LABEL removed" (an occupied court is refused with "Only a free court can be removed"), a waiting
 * match with "Waiting match N removed".
 */
export function SessionView({
  sessionId,
  now,
  onOpenProfile,
  onOpenQueue,
  onAddCourt,
  onEditMatch,
  onAddMatch,
  onStartMatch,
  onPickAnother,
  onOpenMatch,
}: SessionViewProps) {
  const session = useQueueSession(sessionId)
  const roster = useSessionRoster(sessionId)
  const matches = useSessionMatches(sessionId)
  const removeCourt = useRemoveCourt()
  const removeWaitingMatch = useRemoveWaitingMatch()

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
  const ctx: MatchContext = { roster: roster.data.roster, matches: matches.data, courts }
  const byId = (id: string) => ctx.roster.find((p) => p.id === id)
  const clubPlayerOf = (rosterId: string) => byId(rosterId)?.clubPlayerId
  const openProfile = (rosterId: string) => {
    const clubPlayerId = clubPlayerOf(rosterId)
    if (clubPlayerId) onOpenProfile(clubPlayerId)
  }
  const player = (id: string): CourtPlayer => {
    const p: SessionPlayer | undefined = byId(id)
    return {
      id,
      name: p?.nameSnapshot ?? 'Player',
      shortName: p ? shortName(p) : 'Player',
      level: p?.level ?? null,
    }
  }
  const names = (ids: string[]) => ids.map((id) => player(id).shortName)

  const waiting = waitingMatches(ctx.matches)
  const active = activeMatches(ctx.matches)
  const free = freeCourts(courts, ctx.matches)
  const untilLabel = (c: SessionCourt) => formatTime(c.openUntil ?? s.scheduledEndAt)
  const options = {
    onSuccess: (result: { message: string }) => toast(result.message),
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : 'Something went wrong. Try again.'),
  }
  const onRemoveCourt = (c: SessionCourt) => {
    if (removeCourt.isPending) return
    removeCourt.mutate({ sessionId, courtId: c.id }, options)
  }
  const onRemoveMatch = (m: Match) => {
    if (removeWaitingMatch.isPending) return
    removeWaitingMatch.mutate({ sessionId, matchId: m.id }, options)
  }

  // A 5v5 on two courts draws once, as one merged card, under its first court.
  const covered = new Set<string>()
  const cards: CourtCardProps[] = []
  for (const c of courts) {
    if (covered.has(c.id)) continue
    const m: Match | undefined = active.find((x) => x.courtIds.includes(c.id))
    if (m) {
      const merged = m.courtIds.length > 1
      for (const id of m.courtIds) covered.add(id)
      cards.push({
        variant: 'in-game',
        label: merged
          ? m.courtIds.map((id) => courts.find((x) => x.id === id)?.label ?? 'Court').join(' + ')
          : c.label,
        untilLabel: untilLabel(c),
        merged,
        teamA: m.teamA.map(player),
        teamB: m.teamB.map(player),
        onOpenProfile: openProfile,
        formatLabel: FORMAT_LABELS[m.format],
        matchNo: m.matchNo,
        minutes: Math.max(0, Math.round((now - (m.startedAt ?? now)) / 60000)),
        substitutions: m.substitutions.length,
        onOpenMatch: onOpenMatch ? () => onOpenMatch(m.id) : undefined,
      })
      continue
    }
    const next = nextEligibleForCourt(c.id, ctx)
    const eligible = next.match
    const first = waiting[0]
    cards.push({
      variant: 'free',
      label: c.label,
      untilLabel: untilLabel(c),
      bookingEnded: isBookingEnded(c, s.scheduledEndAt, now),
      isLastCourt: courts.length <= 1,
      onRemove: () => onRemoveCourt(c),
      next: next.match
        ? {
            skippedReason: next.skipped ?? undefined,
            position: waiting.indexOf(next.match) + 1,
            formatLabel: FORMAT_LABELS[next.match.format],
            teamA: names(next.match.teamA),
            teamB: names(next.match.teamB),
          }
        : null,
      blockedReason: !next.match && first ? matchStatus(first, ctx).reason : undefined,
      onReviewAndStart:
        eligible && onStartMatch ? () => onStartMatch(eligible.id, c.id) : undefined,
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
    teamA: m.teamA.map(player),
    teamB: m.teamB.map(player),
    onSelectPlayer: openProfile,
    onStart: onStartMatch ? () => onStartMatch(m.id) : undefined,
    onEdit: onEditMatch ? () => onEditMatch(m.id) : undefined,
    onRemove: () => onRemoveMatch(m),
  }))
  const attentionCount = upcoming.filter((m) => m.status.kind === 'needs-attention').length

  return (
    <>
      <section aria-label="Courts" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold">Courts</h2>
          <span className="text-[13px] text-fg2">
            {free.length} of {courts.length} free
          </span>
        </div>
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
    </>
  )
}
