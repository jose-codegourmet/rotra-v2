'use client'

import {
  type MatchContext,
  matchStatus,
  shortName,
  waitingMatches,
} from '@rotra/data/match/match.rules'
import type { Match } from '@rotra/data/match/types'
import { useMoveMatch } from '@rotra/data/match/useMoveMatch'
import { useRemoveWaitingMatch } from '@rotra/data/match/useRemoveWaitingMatch'
import { useSessionMatches } from '@rotra/data/match/useSessionMatches'
import { useSwapPlayers } from '@rotra/data/match/useSwapPlayers'
import { useQueueSession } from '@rotra/data/queue-session/useQueueSession'
import { useSessionRoster } from '@rotra/data/session-roster/useSessionRoster'
import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
import { EmptyState } from '@rotra/ui/empty-state'
import type { MatchCardPlayer } from '@rotra/ui/match-card'
import { Notice } from '@rotra/ui/notice'
import { QueueGrid, type QueueGridMatch } from '@rotra/ui/queue-grid'
import { Skeleton } from '@rotra/ui/skeleton'
import type { SwapSlot } from '@rotra/ui/swap-sides-area'
import { toast } from '@rotra/ui/toaster'
import { QueryError } from '@/app/(operator)/_components/query-error/QueryError'
import type { ConsoleViewProps } from '@/app/(operator)/sessions/[sessionId]/_components/session-console/SessionConsole'

export type QueueViewProps = ConsoleViewProps & {
  /** Add match: opens the Add match sheet (Q-MANUAL, Queue › Match editing). Disabled until given. */
  onAddMatch?: () => void
  /** Edit on a card: opens the Edit lineup sheet for that waiting match (Q-MANUAL). Edit is hidden until given. */
  onEditMatch?: (matchId: string) => void
  /** Suggest: opens the Suggested match sheet (Q-SUGGEST). Disabled until given. */
  onSuggest?: () => void
  /** Auto queue: opens the Auto queue sheet (Q-AUTO). Disabled until given. */
  onAutoQueue?: () => void
  /** Regenerate: opens the Regenerate waiting queue? sheet (Q-REGENERATE). Disabled until given, and when the queue is empty. */
  onRegenerate?: () => void
}

const MODE_LABELS = { chill: 'Chill', fair: 'Fair', hard: 'Hard' } as const

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong. Try again.'

/**
 * Q-QUEUE, the console's Queue view: "Queued matches" with Add match, Suggest, Auto queue and
 * Regenerate (primary while anything needs attention, disabled when the queue is empty), the warn
 * notice "N waiting matches need attention…", the "One waiting list for every court. MODE mode
 * guides suggestions…" line, and the snake QueueGrid of MatchCards with status from matchStatus.
 * Reorder (drag or arrow keys on ⠿) calls useMoveMatch; Remove × calls useRemoveWaitingMatch at
 * once with its toast (no dialog, per dialogs.md); switching sides on a card calls useSwapPlayers,
 * after which the card shows the lock; pictures open the profile. The sheets behind Add match,
 * Edit, Suggest, Auto queue and Regenerate are Queue › Match editing and Queue generation: they
 * arrive through the optional callbacks.
 */
export function QueueView({
  sessionId,
  onOpenProfile,
  onAddMatch,
  onEditMatch,
  onSuggest,
  onAutoQueue,
  onRegenerate,
}: QueueViewProps) {
  const session = useQueueSession(sessionId)
  const roster = useSessionRoster(sessionId)
  const matches = useSessionMatches(sessionId)
  const moveMatch = useMoveMatch()
  const removeWaitingMatch = useRemoveWaitingMatch()
  const swapPlayers = useSwapPlayers()

  const options = {
    onSuccess: (result: { message: string }) => toast(result.message),
    onError: (error: unknown) => toast.error(errorMessage(error)),
  }

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
        <Skeleton className="w-80 max-w-full" />
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,220px),1fr))] gap-2.5">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-56 rounded-lg" />
          ))}
        </div>
      </div>
    )

  const ctx: MatchContext = { roster: roster.data.roster, matches: matches.data, courts: s.courts }
  const waiting = waitingMatches(ctx.matches)
  const attention = waiting.filter((m) => matchStatus(m, ctx).kind === 'needs-attention').length

  const byId = (id: string) => ctx.roster.find((p) => p.id === id)
  const player = (id: string): MatchCardPlayer => {
    const p = byId(id)
    return {
      id,
      name: p?.nameSnapshot ?? 'Player',
      shortName: p ? shortName(p) : 'Player',
      level: p?.level ?? null,
    }
  }
  const openProfile = (rosterId: string) => {
    const clubPlayerId = byId(rosterId)?.clubPlayerId
    if (clubPlayerId) onOpenProfile(clubPlayerId)
  }

  const onMove = (matchId: string, toIndex: number) => {
    if (moveMatch.isPending) return
    moveMatch.mutate({ sessionId, matchId, toIndex }, options)
  }
  const onRemove = (m: Match) => {
    if (removeWaitingMatch.isPending) return
    removeWaitingMatch.mutate({ sessionId, matchId: m.id }, options)
  }
  const onSwapSides = (matchId: string, from: SwapSlot, to: SwapSlot) => {
    const m = waiting.find((x) => x.id === matchId)
    if (!m || from.team === to.team || swapPlayers.isPending) return
    const a = (from.team === 'A' ? m.teamA : m.teamB)[from.index]
    const b = (to.team === 'A' ? m.teamA : m.teamB)[to.index]
    if (!a || !b) return
    swapPlayers.mutate({ sessionId, matchId, a, b }, options)
  }

  const cards: QueueGridMatch[] = waiting.map((m) => ({
    id: m.id,
    matchNo: m.matchNo,
    format: m.format,
    origin: m.origin,
    manualProtected: m.manualProtected,
    status: matchStatus(m, ctx),
    teamA: m.teamA.map(player),
    teamB: m.teamB.map(player),
    onSelectPlayer: openProfile,
    onEdit: onEditMatch ? () => onEditMatch(m.id) : undefined,
    onRemove: () => onRemove(m),
  }))

  return (
    <section aria-label="Queued matches" className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold">Queued matches</h2>
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap">
          <Button size="sm" disabled={!onAddMatch} onClick={onAddMatch} className="sm:w-auto">
            Add match
          </Button>
          <Button size="sm" disabled={!onSuggest} onClick={onSuggest} className="sm:w-auto">
            Suggest
          </Button>
          <Button size="sm" disabled={!onAutoQueue} onClick={onAutoQueue} className="sm:w-auto">
            Auto queue
          </Button>
          <Button
            size="sm"
            variant={attention ? 'primary' : 'secondary'}
            disabled={!onRegenerate || waiting.length === 0}
            onClick={onRegenerate}
            className="sm:w-auto"
          >
            Regenerate
          </Button>
        </div>
      </div>
      {attention ? (
        <Notice tone="warn">
          {attention} waiting {attention > 1 ? 'matches need' : 'match needs'} attention. Edit the
          lineup to swap the player, or regenerate.
        </Notice>
      ) : null}
      <p className="text-[13px] text-fg2">
        One waiting list for every court. {MODE_LABELS[s.sessionMode]} mode guides suggestions; you
        can override any of it.
      </p>
      {waiting.length ? (
        <QueueGrid matches={cards} onMove={onMove} onSwapSides={onSwapSides} />
      ) : (
        <Card padding="none">
          <EmptyState>
            No waiting matches. Use Auto queue to generate a few, or add one yourself.
          </EmptyState>
        </Card>
      )}
    </section>
  )
}
