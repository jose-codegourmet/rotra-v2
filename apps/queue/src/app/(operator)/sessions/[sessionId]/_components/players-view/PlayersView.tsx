'use client'

import { useClubPlayers } from '@rotra/data/club-player/useClubPlayers'
import {
  activeMatchFor,
  allPlayers,
  countedGames,
  courtNames,
  FORMAT_LABELS,
  gamesPlayed,
  isFunFormat,
  queuedCount,
  shortName,
  waitingMatches,
  waitMinutes,
} from '@rotra/data/match/match.rules'
import {
  arrangeToBalance,
  formatForSelection,
  previewMakeMatch,
} from '@rotra/data/match/queue.rules'
import { useMakeMatch } from '@rotra/data/match/useMakeMatch'
import { useSessionMatches } from '@rotra/data/match/useSessionMatches'
import { PLAYING_LEVELS } from '@rotra/data/player/types'
import { selfCheckInMark } from '@rotra/data/public-session/rules'
import { slotCapacity } from '@rotra/data/queue-session/queueSession.rules'
import { useQueueSession } from '@rotra/data/queue-session/useQueueSession'
import {
  inUnfinishedMatch,
  stepDownBlockedText,
} from '@rotra/data/session-roster/sessionRoster.rules'
import type { SessionPlayer } from '@rotra/data/session-roster/types'
import { useFillOpenSlots } from '@rotra/data/session-roster/useFillOpenSlots'
import { useGiveSlot } from '@rotra/data/session-roster/useGiveSlot'
import { useRemoveFromWaitlist } from '@rotra/data/session-roster/useRemoveFromWaitlist'
import { useSessionRoster } from '@rotra/data/session-roster/useSessionRoster'
import { useSetGamesPlayed } from '@rotra/data/session-roster/useSetGamesPlayed'
import { useSetPresenceMany } from '@rotra/data/session-roster/useSetPresenceMany'
import { useStepDownToWaitlist } from '@rotra/data/session-roster/useStepDownToWaitlist'
import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
import { ConfirmMakeMatchSheet } from '@rotra/ui/confirm-make-match-sheet'
import { EmptyState } from '@rotra/ui/empty-state'
import { PlayerPoolCard, type PlayerPoolCardStatus } from '@rotra/ui/player-pool-card'
import {
  type PlayerPoolShow,
  type PlayerPoolSort,
  PlayerPoolToolbar,
} from '@rotra/ui/player-pool-toolbar'
import { profilePictureSrc } from '@rotra/ui/profile-picture'
import { SelectionBar } from '@rotra/ui/selection-bar'
import { SetGamesSheet, type SetGamesTarget } from '@rotra/ui/set-games-sheet'
import { Skeleton } from '@rotra/ui/skeleton'
import { SlotMeter } from '@rotra/ui/slot-meter'
import { toast } from '@rotra/ui/toaster'
import { WaitlistPanel, type WaitlistPanelEntry } from '@rotra/ui/waitlist-panel'
import { useRef, useState } from 'react'
import { AddPlayer } from '@/app/(operator)/_components/add-player/AddPlayer'
import { OverfillConfirm } from '@/app/(operator)/_components/overfill-confirm/OverfillConfirm'
import { QueryError } from '@/app/(operator)/_components/query-error/QueryError'
import type { ConsoleViewProps } from '@/app/(operator)/sessions/[sessionId]/_components/session-console/SessionConsole'

export type PlayersViewProps = ConsoleViewProps

/** One roster player with what the grid needs to filter, sort and draw them */
type PoolRow = {
  player: SessionPlayer
  playing: boolean
  games: number
  minutes: number
  status: PlayerPoolCardStatus
}

const levelIndex = (p: SessionPlayer) => (p.level ? PLAYING_LEVELS.indexOf(p.level) : -1)

/** The prototype's sorters: longest wait keeps off-court first, then present first */
const SORTERS: Record<PlayerPoolSort, (a: PoolRow, b: PoolRow) => number> = {
  wait: (a, b) =>
    Number(a.playing) - Number(b.playing) ||
    Number(b.player.present) - Number(a.player.present) ||
    b.minutes - a.minutes,
  least: (a, b) => a.games - b.games || b.minutes - a.minutes,
  most: (a, b) => b.games - a.games || a.player.nameSnapshot.localeCompare(b.player.nameSnapshot),
  level: (a, b) =>
    levelIndex(b.player) - levelIndex(a.player) ||
    a.player.nameSnapshot.localeCompare(b.player.nameSnapshot),
}

/** The roster's median shown count, prefilled by Set games for all… (#717); 0 for an empty roster */
export const medianGames = (counts: number[]) => {
  const sorted = [...counts].sort((a, b) => a - b)
  if (!sorted.length) return 0
  const mid = sorted.length / 2
  return sorted.length % 2
    ? (sorted[Math.floor(mid)] ?? 0)
    : Math.round(((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2)
}

const time = (at: number) =>
  new Date(at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong. Try again.'

/**
 * Q-POOL, the console's Players view: "Players" with "P present of R" and Add late player (the
 * shared AddPlayer container, live so late players are present with locked levels), the
 * PlayerPoolToolbar filter and sort in local state (Available, longest wait by default), the
 * PlayerPoolCard grid built from the match rules (games, wait minutes, On Court X / Away /
 * Queued · #P / Free), the pick order in local state with the SelectionBar while anyone is picked,
 * the Waitlist panel when anyone waits or the session is full, and the footer line. Set games for
 * all… and each card's Set games played… open SetGamesSheet on useSetGamesPlayed (#717); games is the
 * adjusted count (gamesPlayed). Each card's Move to waitlist (#735) toasts “Finish or remove NAME's
 * match first.” while the player is in a match, otherwise steps them down; Admit player on a full
 * roster asks OverfillConfirm first. Pictures on
 * waitlist rows open profiles through onOpenProfile; the Present switch uses a shared optimistic 800 ms presence batch, retaining pending cards in their
 * filter and reporting one summary with the unique waiting-match attention count.
 */
/** What the Set games played sheet shows for one card or for Set games for all… */
function setGamesTarget(target: string | 'all', rows: PoolRow[]): SetGamesTarget {
  if (target === 'all')
    return { kind: 'all', count: rows.length, median: medianGames(rows.map((r) => r.games)) }
  const row = rows.find((r) => r.player.id === target)
  return { kind: 'one', name: row?.player.nameSnapshot ?? 'Player', current: row?.games ?? 0 }
}

export function PlayersView({ sessionId, now, onOpenProfile }: PlayersViewProps) {
  const session = useQueueSession(sessionId)
  const roster = useSessionRoster(sessionId)
  const matches = useSessionMatches(sessionId)
  const clubPlayers = useClubPlayers()
  const setPresence = useSetPresenceMany(sessionId, {
    onSuccess: (result) => toast(result.message),
    onError: (error) => toast.error(errorMessage(error)),
  })
  const makeMatch = useMakeMatch()
  const giveSlot = useGiveSlot()
  const fillOpenSlots = useFillOpenSlots()
  const removeFromWaitlist = useRemoveFromWaitlist()
  const setGamesPlayed = useSetGamesPlayed()
  const stepDown = useStepDownToWaitlist()
  const steppingDown = useRef(new Set<string>())
  /** Admit player on a full roster waits for D-OVERFILL (#735) */
  const [overfillWaiter, setOverfillWaiter] = useState<string | null>(null)
  /** Set games played: one roster id, or 'all' */
  const [setGamesFor, setSetGamesFor] = useState<string | 'all' | null>(null)
  const [setGamesError, setSetGamesError] = useState<string | undefined>()
  const [show, setShow] = useState<PlayerPoolShow>('available')
  const [sort, setSort] = useState<PlayerPoolSort>('wait')
  const [held, setHeld] = useState<{ filter: PlayerPoolShow; ids: string[] } | null>(null)
  /** Roster ids in pick order */
  const [picked, setPicked] = useState<string[]>([])
  const [addOpen, setAddOpen] = useState(false)
  const [draft, setDraft] = useState<ReturnType<typeof previewMakeMatch> | null>(null)
  const [arranged, setArranged] = useState(false)
  const [makeError, setMakeError] = useState<string | undefined>()

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
        <Skeleton className="h-11 w-80 max-w-full rounded-lg" />
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,176px),1fr))] gap-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      </div>
    )

  const rosterList = roster.data.roster
  const waitlist = roster.data.waitlist
  const all = matches.data
  const waiting = waitingMatches(all)
  const byClubPlayer = (id: string) => clubPlayers.data?.players.find((p) => p.id === id)

  const photoFor = (player: SessionPlayer | undefined) => {
    const p = player ? byClubPlayer(player.clubPlayerId) : undefined
    return p
      ? profilePictureSrc(p.picture, p.playerId ?? p.id, p.pictureName ?? p.fullName)
      : undefined
  }
  const rows: PoolRow[] = rosterList.map((player) => {
    const active = activeMatchFor(player.id, all)
    const queueIndex = waiting.findIndex((m) => allPlayers(m).includes(player.id))
    const status: PlayerPoolCardStatus = active
      ? { kind: 'playing', courtLabel: courtNames(active, s.courts) }
      : !player.present
        ? { kind: 'away' }
        : queueIndex >= 0
          ? { kind: 'queued', position: queueIndex + 1 }
          : { kind: 'free' }
    return {
      player,
      playing: !!active,
      games: gamesPlayed(player, all),
      minutes: waitMinutes(player, all, s.startedAt, now),
      status,
    }
  })
  const counts = {
    available: rows.filter((r) => r.player.present && !r.playing).length,
    present: rows.filter((r) => r.player.present).length,
    everyone: rows.length,
  }
  const retained = (id: string) =>
    held?.filter === show && held.ids.includes(id) && setPresence.pending.has(id)
  const shown = rows
    .filter((r) =>
      show === 'available'
        ? (r.player.present && !r.playing) || retained(r.player.id)
        : show === 'present'
          ? r.player.present || retained(r.player.id)
          : true,
    )
    .sort(SORTERS[sort])
  if (held?.filter === show && setPresence.pending.size) {
    const rank = (id: string) => {
      const index = held.ids.indexOf(id)
      return index < 0 ? Infinity : index
    }
    shown.sort((a, b) => rank(a.player.id) - rank(b.player.id))
  }

  // A pick survives only while that player is still on the roster.
  const selection = picked.filter((id) => rosterList.some((p) => p.id === id))
  const selected = selection
    .map((id) => rosterList.find((p) => p.id === id))
    .filter((p): p is SessionPlayer => !!p)
  const plan = formatForSelection(selection.length, s)
  const planLabel = plan.format
    ? `${FORMAT_LABELS[plan.format]}${isFunFormat(plan.format) ? ', counts toward session games only' : ''}`
    : plan.reason
  const toggle = (rosterId: string) =>
    setPicked((prev) =>
      prev.includes(rosterId) ? prev.filter((id) => id !== rosterId) : [...prev, rosterId],
    )

  const capacity = slotCapacity(s.courts.length, s.playersPerCourt)
  const full = rosterList.length >= capacity
  const entries: WaitlistPanelEntry[] = waitlist.map((w) => {
    const p = byClubPlayer(w.clubPlayerId)
    return {
      id: w.id,
      name: p?.fullName ?? '…',
      level: w.level,
      waitingSinceLabel: time(w.addedAt),
    }
  })
  const overfillEntry = entries.find((w) => w.id === overfillWaiter)
  const giveSlotTo = (waitlistId: string) => giveSlot.mutate({ sessionId, waitlistId }, options)
  /** Move to waitlist (#735): blocked with a toast while the player is in any unfinished match. */
  const stepDownPlayer = (player: SessionPlayer) => {
    if (inUnfinishedMatch(player.id, all)) {
      toast(stepDownBlockedText(shortName(player)))
      return
    }
    if (steppingDown.current.has(player.id)) return
    steppingDown.current.add(player.id)
    setPicked((prev) => prev.filter((id) => id !== player.id))
    stepDown.mutate(
      { sessionId, rosterId: player.id, operationId: crypto.randomUUID() },
      { ...options, onSettled: () => steppingDown.current.delete(player.id) },
    )
  }
  const openProfileFromWaitlist = (waitlistId: string) => {
    const w = waitlist.find((w) => w.id === waitlistId)
    if (w) onOpenProfile(w.clubPlayerId)
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Players</h2>
          <p className="text-[13px] text-fg2">
            Tap players to pick them, then make a match. {counts.present} present of{' '}
            {counts.everyone}.
          </p>
        </div>
        <div className="flex flex-nowrap gap-2">
          <Button
            size="sm"
            disabled={!rosterList.length}
            onClick={() => {
              setSetGamesError(undefined)
              void setPresence.flush().then(() => setSetGamesFor('all'))
            }}
          >
            Set games for all…
          </Button>
          <Button
            size="sm"
            onClick={() => {
              void setPresence.flush().then(() => setAddOpen(true))
            }}
          >
            Add late player
          </Button>
        </div>
      </div>
      <SlotMeter
        live
        rosterCount={rosterList.length}
        capacity={capacity}
        waitlistCount={waitlist.length}
      />
      <PlayerPoolToolbar
        show={show}
        onShowChange={(value) => {
          setHeld(null)
          setShow(value)
        }}
        counts={counts}
        sort={sort}
        onSortChange={(value) => {
          setHeld(null)
          setSort(value)
        }}
      />
      {shown.length ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,176px),1fr))] gap-3">
          {shown.map((row) => {
            const order = selection.indexOf(row.player.id)
            // The Queue Master's last action wins; hide the mark while a presence change is saving.
            const mark = setPresence.pending.has(row.player.id) ? null : selfCheckInMark(row.player)
            return (
              <PlayerPoolCard
                key={row.player.id}
                name={row.player.nameSnapshot}
                photoUrl={photoFor(row.player)}
                level={row.player.level}
                games={row.games}
                forTheNight={row.games + queuedCount(row.player.id, all)}
                waitMinutes={row.minutes}
                status={row.status}
                present={row.player.present}
                presencePending={setPresence.pending.has(row.player.id)}
                selfCheckedInAt={mark?.kind === 'checked-in' ? mark.at : null}
                leftAt={mark?.kind === 'left' ? mark.at : null}
                selected={order >= 0}
                pickOrder={order >= 0 ? order + 1 : undefined}
                onToggleSelect={() => toggle(row.player.id)}
                onOpenProfile={() => onOpenProfile(row.player.clubPlayerId)}
                onSetGames={() => {
                  setSetGamesError(undefined)
                  void setPresence.flush().then(() => setSetGamesFor(row.player.id))
                }}
                onStepDown={() => {
                  void setPresence.flush().then(() => stepDownPlayer(row.player))
                }}
                onPresentChange={(present) => {
                  if (!setPresence.pending.size || held?.filter !== show)
                    setHeld({ filter: show, ids: shown.map((r) => r.player.id) })
                  setPresence.set(row.player.id, present)
                }}
              />
            )
          })}
        </div>
      ) : (
        <Card>
          <EmptyState>
            {show === 'available'
              ? 'No one is free right now. Try Present or Everyone.'
              : 'No players yet.'}
          </EmptyState>
        </Card>
      )}
      {selection.length ? (
        <SelectionBar
          players={selected.map((p) => ({ id: p.id, name: p.nameSnapshot }))}
          label={planLabel}
          valid={!!plan.format}
          onClear={() => setPicked([])}
          onMakeMatch={async () => {
            await setPresence.flush()
            if (!plan.format) return
            setMakeError(undefined)
            setArranged(false)
            setDraft(previewMakeMatch(selected, plan.format))
          }}
        />
      ) : null}
      {waitlist.length || full ? (
        <WaitlistPanel
          live
          isPending={giveSlot.isPending || fillOpenSlots.isPending || removeFromWaitlist.isPending}
          serverError={
            giveSlot.error || fillOpenSlots.error || removeFromWaitlist.error
              ? errorMessage(giveSlot.error ?? fillOpenSlots.error ?? removeFromWaitlist.error)
              : undefined
          }
          entries={entries}
          rosterCount={rosterList.length}
          courtCount={s.courts.length}
          playersPerCourt={s.playersPerCourt}
          onFillOpenSlots={() => fillOpenSlots.mutate(sessionId, options)}
          onGiveSlot={(waitlistId) => {
            if (full) setOverfillWaiter(waitlistId)
            else giveSlotTo(waitlistId)
          }}
          onRemove={(waitlistId) => removeFromWaitlist.mutate({ sessionId, waitlistId }, options)}
          onOpenProfile={openProfileFromWaitlist}
        />
      ) : null}
      {draft ? (
        <ConfirmMakeMatchSheet
          open
          teamA={draft.lineup.teamA.map((id) => {
            const p = rosterList.find((player) => player.id === id)
            return {
              id,
              name: p?.nameSnapshot ?? 'Player',
              shortName: p ? shortName(p) : 'Player',
              level: p?.level ?? null,
              photoUrl: photoFor(p),
              games: p ? gamesPlayed(p, all) : countedGames(id, all),
            }
          })}
          teamB={draft.lineup.teamB.map((id) => {
            const p = rosterList.find((player) => player.id === id)
            return {
              id,
              name: p?.nameSnapshot ?? 'Player',
              shortName: p ? shortName(p) : 'Player',
              level: p?.level ?? null,
              photoUrl: photoFor(p),
              games: p ? gamesPlayed(p, all) : countedGames(id, all),
            }
          })}
          formatLabel={FORMAT_LABELS[draft.lineup.format]}
          levelA={draft.levelA}
          levelB={draft.levelB}
          arranged={arranged}
          isPending={makeMatch.isPending}
          error={makeError}
          onCancel={() => {
            setDraft(null)
            setMakeError(undefined)
          }}
          onArrange={() => {
            const ids = [...draft.lineup.teamA, ...draft.lineup.teamB]
            const players = ids
              .map((id) => rosterList.find((player) => player.id === id))
              .filter((player): player is SessionPlayer => !!player)
            if (players.length !== ids.length) {
              setMakeError('Player not available.')
              return
            }
            setDraft(arrangeToBalance(players, draft.lineup.format))
            setArranged(true)
            setMakeError(undefined)
          }}
          onConfirm={() => {
            makeMatch.mutate(
              {
                sessionId,
                selection: [...draft.lineup.teamA, ...draft.lineup.teamB],
                lineup: draft.lineup,
              },
              {
                onSuccess: (result) => {
                  setPicked([])
                  setDraft(null)
                  setMakeError(undefined)
                  toast(result.message)
                },
                onError: (error) => setMakeError(errorMessage(error)),
              },
            )
          }}
        />
      ) : null}
      <p className="text-[13px] text-fg2">
        Make match shows the selected players in pick order. Arrange to balance teams by level, then
        add the match to the end of the queue. Present controls who can be paired automatically;
        turning someone off never ends their current game.
      </p>
      {setGamesFor ? (
        <SetGamesSheet
          open
          onOpenChange={(open) => {
            if (!open) setSetGamesFor(null)
          }}
          target={setGamesTarget(setGamesFor, rows)}
          isPending={setGamesPlayed.isPending}
          error={setGamesError}
          onConfirm={(games) => {
            setGamesPlayed.mutate(
              { sessionId, rosterId: setGamesFor, games, operationId: crypto.randomUUID() },
              {
                onSuccess: (result) => {
                  setSetGamesFor(null)
                  toast(result.message)
                },
                onError: (error) => setSetGamesError(errorMessage(error)),
              },
            )
          }}
        />
      ) : null}
      <OverfillConfirm
        target={overfillEntry ? { name: overfillEntry.name } : null}
        session={s}
        rosterCount={rosterList.length}
        capacity={capacity}
        onCancel={() => setOverfillWaiter(null)}
        onAddAnyway={() => {
          setOverfillWaiter(null)
          if (overfillEntry) giveSlotTo(overfillEntry.id)
        }}
      />
      <AddPlayer sessionId={sessionId} open={addOpen} onOpenChange={setAddOpen} />
    </div>
  )
}
