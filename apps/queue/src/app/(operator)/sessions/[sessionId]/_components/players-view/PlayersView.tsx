'use client'

import { useClubPlayerDetails } from '@rotra/data/club-player/useClubPlayerDetails'
import { useClubPlayers } from '@rotra/data/club-player/useClubPlayers'
import { useRemoveClubPlayerPicture } from '@rotra/data/club-player/useRemoveClubPlayerPicture'
import { useRenameClubPlayer } from '@rotra/data/club-player/useRenameClubPlayer'
import { useSetClubNickname } from '@rotra/data/club-player/useSetClubNickname'
import { useSetClubPlayerPicture } from '@rotra/data/club-player/useSetClubPlayerPicture'
import { useUseClubPlayerPreviousPicture } from '@rotra/data/club-player/useUseClubPlayerPreviousPicture'
import {
  activeMatchFor,
  allPlayers,
  countedGames,
  courtNames,
  FORMAT_LABELS,
  gamesPlayed,
  isFunFormat,
  queuedCount,
  queueMasterName,
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
import { MockError } from '@rotra/data/mock/errors'
import { PLAYING_LEVELS } from '@rotra/data/player/types'
import { selfCheckInMark } from '@rotra/data/public-session/rules'
import { slotCapacity } from '@rotra/data/queue-session/queueSession.rules'
import { useQueueSession } from '@rotra/data/queue-session/useQueueSession'
import { sameHandicap } from '@rotra/data/session-roster/handicap'
import type { SessionPlayer } from '@rotra/data/session-roster/types'
import { useFillOpenSlots } from '@rotra/data/session-roster/useFillOpenSlots'
import { useGiveSlot } from '@rotra/data/session-roster/useGiveSlot'
import {
  useMarkNoShow,
  useSessionNoShows,
  useUndoNoShow,
} from '@rotra/data/session-roster/useNoShow'
import { useRemoveFromWaitlist } from '@rotra/data/session-roster/useRemoveFromWaitlist'
import { useSessionRoster } from '@rotra/data/session-roster/useSessionRoster'
import { useSetGamesPlayed } from '@rotra/data/session-roster/useSetGamesPlayed'
import { useSetHandicap } from '@rotra/data/session-roster/useSetHandicap'
import { useSetPresence } from '@rotra/data/session-roster/useSetPresence'
import { useSetPresenceMany } from '@rotra/data/session-roster/useSetPresenceMany'
import { Avatar } from '@rotra/ui/avatar'
import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
import { ConfirmMakeMatchSheet } from '@rotra/ui/confirm-make-match-sheet'
import { ConfirmSheet } from '@rotra/ui/confirm-sheet'
import { EditLivePlayerSheet } from '@rotra/ui/edit-live-player-sheet'
import type { EditLivePlayerFormValues } from '@rotra/ui/edit-live-player-sheet/schema'
import { EmptyState } from '@rotra/ui/empty-state'
import { NoShowPanel } from '@rotra/ui/no-show-panel'
import { PlayerPoolCard, type PlayerPoolCardStatus } from '@rotra/ui/player-pool-card'
import {
  DEFAULT_PLAYER_POOL_SORT,
  type PlayerPoolShow,
  type PlayerPoolSort,
  type PlayerPoolSortKey,
  PlayerPoolToolbar,
} from '@rotra/ui/player-pool-toolbar'
import { profilePictureSrc } from '@rotra/ui/profile-picture'
import { SelectionBar } from '@rotra/ui/selection-bar'
import { SetGamesSheet, type SetGamesTarget } from '@rotra/ui/set-games-sheet'
import { Skeleton } from '@rotra/ui/skeleton'
import { SlotMeter } from '@rotra/ui/slot-meter'
import { StatusLegend } from '@rotra/ui/status-legend'
import { toast } from '@rotra/ui/toaster'
import { WaitlistPanel, type WaitlistPanelEntry } from '@rotra/ui/waitlist-panel'
import { useState } from 'react'
import { AddPlayer } from '@/app/(operator)/_components/add-player/AddPlayer'
import { OverfillConfirm } from '@/app/(operator)/_components/overfill-confirm/OverfillConfirm'
import { QueryError } from '@/app/(operator)/_components/query-error/QueryError'
import type { ConsoleViewProps } from '@/app/(operator)/sessions/[sessionId]/_components/session-console/SessionConsole'

export type PlayersViewProps = ConsoleViewProps

/** One roster player with what the grid needs to filter, sort and draw them */
type PoolRow = {
  player: SessionPlayer
  playing: boolean
  /** In a waiting Main Queue match (the Queued pill) */
  queued: boolean
  games: number
  /** The card's Total: games played plus games queued for the night */
  total: number
  minutes: number
  status: PlayerPoolCardStatus
}

const levelIndex = (p: SessionPlayer) => (p.level ? PLAYING_LEVELS.indexOf(p.level) : -1)

/**
 * By the name the card shows (owner, November 25, 2026): club nickname, then nickname, then full
 * name, ignoring case ("andong" sits with "Ali", not after "Zed").
 */
const sortName = (p: SessionPlayer) =>
  p.clubNickname?.trim() || p.nicknameSnapshot || p.nameSnapshot
const byName = (a: PoolRow, b: PoolRow) =>
  sortName(a.player).localeCompare(sortName(b.player), undefined, { sensitivity: 'base' })

/**
 * The prototype's sorters (owner, November 25, 2026), each in its first direction times `dir`:
 * Name A–Z, Games fewest first (the card's Total), Wait longest first (off court first, then
 * present first, whichever way) and Level high to low.
 */
const SORTERS: Record<PlayerPoolSortKey, (dir: 1 | -1) => (a: PoolRow, b: PoolRow) => number> = {
  name: (dir) => (a, b) => dir * byName(a, b),
  games: (dir) => (a, b) => dir * (a.total - b.total) || b.minutes - a.minutes || byName(a, b),
  wait: (dir) => (a, b) =>
    Number(a.playing) - Number(b.playing) ||
    Number(b.player.present) - Number(a.player.present) ||
    dir * (b.minutes - a.minutes) ||
    byName(a, b),
  level: (dir) => (a, b) => dir * (levelIndex(b.player) - levelIndex(a.player)) || byName(a, b),
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
const pictureMessage = (error: unknown) =>
  error instanceof MockError ? (error.fieldErrors?.picture ?? error.message) : errorMessage(error)

/**
 * Q-POOL, the console's Players view: "Players" with "P present of R" and Add late player (the
 * shared AddPlayer container, live so late players are present with locked levels), the
 * PlayerPoolToolbar filter and sort in local state (Available, longest wait by default), the
 * PlayerPoolCard grid built from the match rules (games, wait minutes, On Court X / Away /
 * Queued · #P / Free), the pick order in local state with the SelectionBar while anyone is picked,
 * the Waitlist panel (under the cards when anyone waits or the session is full; in place of the cards
 * with no sort menu under the Waitlist filter, which also has Not here for away players), and the
 * footer line. Set games for all… and each card's Current button open SetGamesSheet on
 * useSetGamesPlayed (#717); games is the adjusted count (gamesPlayed). Each card's pencil opens
 * EditLivePlayerSheet (D-EDIT-LIVE-PLAYER): Save changes applies only what changed through the
 * rename (unclaimed and guest) or club nickname (registered), games played and presence hooks (the picture applies at once, as Edit details)
 * and toasts “Changes saved · NAME” or “No changes”. There is no Move to waitlist on a live card.
 * Admit player on a full roster asks OverfillConfirm first. Pictures on
 * waitlist rows open profiles through onOpenProfile; the Present switch uses a shared optimistic 800 ms presence batch, retaining pending cards in their
 * filter and reporting one summary with the unique waiting-match attention count.
 */
/** What the Set games played sheet shows for one card or for Set games for all… */
function setGamesTarget(target: string | 'all', rows: PoolRow[]): SetGamesTarget {
  if (target === 'all')
    return { kind: 'all', count: rows.length, median: medianGames(rows.map((r) => r.games)) }
  const row = rows.find((r) => r.player.id === target)
  return {
    kind: 'one',
    name: row ? queueMasterName(row.player) : 'Player',
    current: row?.games ?? 0,
  }
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
  const setHandicap = useSetHandicap()
  const setPresenceOne = useSetPresence()
  const setClubNickname = useSetClubNickname()
  const renameClubPlayer = useRenameClubPlayer()
  const setPicture = useSetClubPlayerPicture()
  const removePicture = useRemoveClubPlayerPicture()
  const previousPicture = useUseClubPlayerPreviousPicture()
  const noShows = useSessionNoShows(sessionId)
  const markNoShow = useMarkNoShow()
  const undoNoShow = useUndoNoShow()
  /** The roster id whose "Mark NAME as No show?" confirmation is open */
  const [noShowFor, setNoShowFor] = useState<string | null>(null)
  const [noShowError, setNoShowError] = useState<string | undefined>()
  /** Admit player on a full roster waits for D-OVERFILL (#735) */
  const [overfillWaiter, setOverfillWaiter] = useState<string | null>(null)
  /** Set games played: one roster id, or 'all' */
  const [setGamesFor, setSetGamesFor] = useState<string | 'all' | null>(null)
  const [setGamesError, setSetGamesError] = useState<string | undefined>()
  /** Edit player (D-EDIT-LIVE-PLAYER): the roster id whose sheet is open */
  const [editFor, setEditFor] = useState<string | null>(null)
  const [editError, setEditError] = useState<string | undefined>()
  const [editPending, setEditPending] = useState(false)
  const [pictureError, setPictureError] = useState<string | undefined>()
  const [show, setShow] = useState<PlayerPoolShow>('available')
  const [sort, setSort] = useState<PlayerPoolSort>(DEFAULT_PLAYER_POOL_SORT)
  const [held, setHeld] = useState<{ filter: PlayerPoolShow; ids: string[] } | null>(null)
  /** Roster ids in pick order */
  const [picked, setPicked] = useState<string[]>([])
  const [addOpen, setAddOpen] = useState(false)
  const [draft, setDraft] = useState<ReturnType<typeof previewMakeMatch> | null>(null)
  const [arranged, setArranged] = useState(false)
  const [makeError, setMakeError] = useState<string | undefined>()

  // Only an unclaimed player has a club-set picture to edit here.
  const editRow = roster.data?.roster.find((p) => p.id === editFor)
  const editClub = clubPlayers.data?.players.find((p) => p.id === editRow?.clubPlayerId)
  const pictureDetails = useClubPlayerDetails(
    editClub?.identity === 'unclaimed' ? editClub.id : null,
  )

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
      ? {
          kind: 'playing',
          courtLabel: courtNames(active, s.courts),
          // Getting ready (on court, not started) has no minutes yet.
          minutes:
            active.state === 'active' && active.startedAt != null
              ? (now - active.startedAt) / 60_000
              : null,
        }
      : !player.present
        ? { kind: 'away' }
        : queueIndex >= 0
          ? { kind: 'queued', position: queueIndex + 1 }
          : { kind: 'free' }
    return {
      player,
      playing: !!active,
      queued: queueIndex >= 0,
      games: gamesPlayed(player, all),
      total: gamesPlayed(player, all) + queuedCount(player.id, all),
      minutes: waitMinutes(player, all, s.startedAt, now),
      status,
    }
  })
  const counts = {
    available: rows.filter((r) => r.player.present && !r.playing).length,
    // In queue: present players off court in a waiting Main Queue match (the cards' Queued pill).
    queue: rows.filter((r) => r.player.present && !r.playing && r.queued).length,
    playing: rows.filter((r) => r.playing).length,
    present: rows.filter((r) => r.player.present).length,
    away: rows.filter((r) => !r.player.present).length,
    waitlist: waitlist.length,
    everyone: rows.length,
  }
  const retained = (id: string) =>
    held?.filter === show && held.ids.includes(id) && setPresence.pending.has(id)
  const shown = rows
    .filter((r) =>
      show === 'available'
        ? (r.player.present && !r.playing) || retained(r.player.id)
        : show === 'queue'
          ? (r.player.present && !r.playing && r.queued) || retained(r.player.id)
          : show === 'playing'
            ? r.playing || retained(r.player.id)
            : show === 'present'
              ? r.player.present || retained(r.player.id)
              : show === 'away'
                ? !r.player.present || retained(r.player.id)
                : true,
    )
    .sort(SORTERS[sort.key](sort.dir))
  if (held?.filter === show && setPresence.pending.size) {
    const rank = (id: string) => {
      const index = held.ids.indexOf(id)
      return index < 0 ? Infinity : index
    }
    shown.sort((a, b) => rank(a.player.id) - rank(b.player.id))
  }

  /**
   * All present / All away and the selection bar's Set present / Set away (owner, November 25,
   * 2026): the same presence batch as each card's switch, so one toast reports the change. Only
   * players whose presence would change are sent; the grid keeps its order while the batch saves.
   */
  const setPresenceFor = (ids: string[], present: boolean) => {
    const changing = ids.filter((id) => rosterList.find((p) => p.id === id)?.present !== present)
    if (!changing.length) return
    if (!setPresence.pending.size || held?.filter !== show)
      setHeld({ filter: show, ids: shown.map((r) => r.player.id) })
    for (const id of changing) setPresence.set(id, present)
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
  const noShowTarget = rosterList.find((p) => p.id === noShowFor)
  const noShowList = noShows.data ?? []
  const confirmNoShow = (player: SessionPlayer) => {
    setNoShowError(undefined)
    markNoShow.mutate(
      { sessionId, rosterId: player.id },
      {
        onSuccess: (result) => {
          setNoShowFor(null)
          setPicked((prev) => prev.filter((id) => id !== player.id))
          toast(result.message)
        },
        onError: (error) => {
          setNoShowFor(null)
          toast(errorMessage(error))
        },
      },
    )
  }
  const openProfileFromWaitlist = (waitlistId: string) => {
    const w = waitlist.find((w) => w.id === waitlistId)
    if (w) onOpenProfile(w.clubPlayerId)
  }
  const waitlistNode = (
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
  )

  const editPlayer = rosterList.find((p) => p.id === editFor)
  const editRowData = editPlayer ? rows.find((r) => r.player.id === editPlayer.id) : undefined
  const editClubPlayer = editPlayer ? byClubPlayer(editPlayer.clubPlayerId) : undefined
  const editKind =
    editClubPlayer?.identity === 'registered'
      ? 'registered'
      : editClubPlayer?.identity === 'unclaimed'
        ? 'unclaimed'
        : 'guest'
  const editClubNickname = editPlayer?.clubNickname ?? editClubPlayer?.clubNickname ?? null
  // An unclaimed or guest player has one nickname (the club's own); a registered one has a Club nickname.
  const editNickname =
    editKind === 'registered'
      ? editClubNickname
      : (editClubPlayer?.nickname ?? editPlayer?.nicknameSnapshot ?? null)
  const openEdit = (rosterId: string) => {
    setEditError(undefined)
    setPictureError(undefined)
    void setPresence.flush().then(() => setEditFor(rosterId))
  }
  const closeEdit = () => {
    setEditFor(null)
    setEditError(undefined)
    setPictureError(undefined)
  }
  /** Save changes: only what changed, each through the hook its own screen uses */
  const saveEdit = async (values: EditLivePlayerFormValues) => {
    if (!editPlayer || !editRowData || editPending) return
    setEditError(undefined)
    setEditPending(true)
    let changed = false
    let savedName = editPlayer.nameSnapshot
    try {
      if (editKind !== 'registered') {
        const fullName = (values.fullName ?? editPlayer.nameSnapshot).replace(/\s+/g, ' ').trim()
        const nickname = values.nickname.replace(/\s+/g, ' ').trim()
        if (fullName !== editPlayer.nameSnapshot || nickname !== (editNickname ?? '')) {
          const renamed = await renameClubPlayer.mutateAsync({
            clubPlayerId: editPlayer.clubPlayerId,
            fullName,
            nickname,
          })
          savedName = renamed.data.fullName
          changed = true
        }
      }
      if (editKind === 'registered' && values.nickname !== (editClubNickname ?? '')) {
        await setClubNickname.mutateAsync({
          clubPlayerId: editPlayer.clubPlayerId,
          clubNickname: values.nickname,
        })
        changed = true
      }
      if (values.games !== editRowData.games) {
        await setGamesPlayed.mutateAsync({
          sessionId,
          rosterId: editPlayer.id,
          games: values.games,
          operationId: crypto.randomUUID(),
        })
        changed = true
      }
      // Handicap · tonight (D-2026-11-25-03): the whole set, only when it changed.
      if (!sameHandicap(values.spots, editPlayer.handicapSpots ?? [])) {
        await setHandicap.mutateAsync({
          sessionId,
          rosterId: editPlayer.id,
          spots: values.spots,
          operationId: crypto.randomUUID(),
        })
        changed = true
      }
      if (values.present !== editPlayer.present) {
        await setPresence.flush()
        await setPresenceOne.mutateAsync({
          sessionId,
          rosterId: editPlayer.id,
          present: values.present,
        })
        changed = true
      }
    } catch (error) {
      setEditError(
        error instanceof MockError
          ? (error.fieldErrors?.fullName ?? error.message)
          : errorMessage(error),
      )
      setEditPending(false)
      return
    }
    setEditPending(false)
    closeEdit()
    toast(changed ? `Changes saved · ${savedName}` : 'No changes')
  }
  const pictureCallbacks = (message: string) => ({
    onSuccess: () => toast(`${message} · ${editPlayer?.nameSnapshot ?? ''}`),
    onError: (error: unknown) => setPictureError(pictureMessage(error)),
  })
  const editMatch = editRowData?.playing
    ? {
        status:
          activeMatchFor(editPlayer?.id ?? '', all)?.state === 'on_court'
            ? ('oncourt' as const)
            : ('playing' as const),
        courtLabel: editRowData.status.kind === 'playing' ? editRowData.status.courtLabel : '',
      }
    : null

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
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            size="sm"
            disabled={counts.away === 0}
            onClick={() =>
              setPresenceFor(
                rosterList.map((p) => p.id),
                true,
              )
            }
          >
            All present
          </Button>
          <Button
            size="sm"
            disabled={counts.present === 0}
            onClick={() =>
              setPresenceFor(
                rosterList.map((p) => p.id),
                false,
              )
            }
          >
            All away
          </Button>
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
      {show === 'waitlist' ? (
        waitlistNode
      ) : shown.length ? (
        <>
          <StatusLegend />
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,176px),1fr))] gap-3">
            {shown.map((row) => {
              const order = selection.indexOf(row.player.id)
              // The Queue Master's last action wins; hide the mark while a presence change is saving.
              const mark = setPresence.pending.has(row.player.id)
                ? null
                : selfCheckInMark(row.player)
              return (
                <PlayerPoolCard
                  key={row.player.id}
                  name={row.player.nameSnapshot}
                  nickname={row.player.nicknameSnapshot}
                  clubNickname={row.player.clubNickname}
                  photoUrl={photoFor(row.player)}
                  level={row.player.level}
                  games={row.games}
                  handicapSpots={row.player.handicapSpots}
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
                  onEdit={() => openEdit(row.player.id)}
                  onOpenProfile={() => onOpenProfile(row.player.clubPlayerId)}
                  onSetGames={() => {
                    setSetGamesError(undefined)
                    void setPresence.flush().then(() => setSetGamesFor(row.player.id))
                  }}
                  // No show (cancelled): after Start, away, no games and in no match (#839).
                  onNoShow={
                    s.state === 'active' && !row.player.present && row.games === 0 && !row.playing
                      ? () => {
                          void setPresence.flush().then(() => {
                            setNoShowError(undefined)
                            setNoShowFor(row.player.id)
                          })
                        }
                      : undefined
                  }
                  onPresentChange={(present) => {
                    if (!setPresence.pending.size || held?.filter !== show)
                      setHeld({ filter: show, ids: shown.map((r) => r.player.id) })
                    setPresence.set(row.player.id, present)
                  }}
                />
              )
            })}
          </div>
        </>
      ) : (
        <Card>
          <EmptyState>
            {show === 'available'
              ? 'No one is free right now. Try Present or Everyone.'
              : show === 'away'
                ? 'Everyone on the roster is here.'
                : show === 'queue'
                  ? 'No free player is in a queued match.'
                  : show === 'playing'
                    ? 'No one is on a court right now.'
                    : 'No players yet.'}
          </EmptyState>
        </Card>
      )}
      {selection.length ? (
        <SelectionBar
          players={selected.map((p) => ({ id: p.id, name: queueMasterName(p) }))}
          label={planLabel}
          valid={!!plan.format}
          onClear={() => setPicked([])}
          trailingActions={
            <>
              <Button
                size="sm"
                disabled={selected.every((p) => p.present)}
                onClick={() => {
                  setPresenceFor(selection, true)
                  setPicked([])
                }}
              >
                Set present
              </Button>
              <Button
                size="sm"
                disabled={selected.every((p) => !p.present)}
                onClick={() => {
                  setPresenceFor(selection, false)
                  setPicked([])
                }}
              >
                Set away
              </Button>
            </>
          }
          onMakeMatch={async () => {
            await setPresence.flush()
            if (!plan.format) return
            setMakeError(undefined)
            setArranged(false)
            setDraft(previewMakeMatch(selected, plan.format))
          }}
        />
      ) : null}
      <NoShowPanel
        entries={noShowList.map((x) => ({
          id: x.id,
          name: queueMasterName(x),
          photoUrl: photoFor(x),
          markedLabel: time(x.noShowAt),
        }))}
        full={full}
        isPending={undoNoShow.isPending}
        onBackToRoster={(id) => {
          if (!undoNoShow.isPending) undoNoShow.mutate({ sessionId, rosterId: id }, options)
        }}
        onOpenProfile={(id) => {
          const x = noShowList.find((n) => n.id === id)
          if (x) onOpenProfile(x.clubPlayerId)
        }}
      />
      {show !== 'waitlist' && (waitlist.length || full) ? waitlistNode : null}
      {draft ? (
        <ConfirmMakeMatchSheet
          open
          teamA={draft.lineup.teamA.map((id) => {
            const p = rosterList.find((player) => player.id === id)
            return {
              id,
              name: p?.nameSnapshot ?? 'Player',
              shortName: p ? queueMasterName(p) : 'Player',
              nickname: p?.nicknameSnapshot ?? null,
              clubNickname: p?.clubNickname ?? null,
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
              shortName: p ? queueMasterName(p) : 'Player',
              nickname: p?.nicknameSnapshot ?? null,
              clubNickname: p?.clubNickname ?? null,
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
      {editPlayer && editRowData ? (
        <EditLivePlayerSheet
          open
          shownName={
            editClubNickname?.trim() || editPlayer.nicknameSnapshot || editPlayer.nameSnapshot
          }
          fullName={editPlayer.nameSnapshot}
          kind={editKind}
          level={editPlayer.level}
          photoUrl={photoFor(editPlayer)}
          match={editMatch}
          clubNickname={editNickname}
          accountNickname={editClubPlayer?.nickname ?? null}
          games={Math.min(99, editRowData.games)}
          present={editPlayer.present}
          handicapSpots={editPlayer.handicapSpots}
          picture={
            editKind === 'unclaimed' && pictureDetails.data?.picture && editClubPlayer
              ? {
                  playerId: editClubPlayer.playerId ?? editClubPlayer.id,
                  picture: pictureDetails.data.picture,
                  onChange: (choice) => {
                    setPictureError(undefined)
                    setPicture.mutate(
                      choice.kind === 'photo'
                        ? { clubPlayerId: editClubPlayer.id, kind: 'photo', file: choice.file }
                        : {
                            clubPlayerId: editClubPlayer.id,
                            kind: 'character',
                            characterId: choice.characterId,
                          },
                      pictureCallbacks('Picture updated'),
                    )
                  },
                  onRemove: () => {
                    setPictureError(undefined)
                    removePicture.mutate(
                      { clubPlayerId: editClubPlayer.id },
                      pictureCallbacks('Using initials'),
                    )
                  },
                  onUsePrevious: () => {
                    setPictureError(undefined)
                    previousPicture.mutate(
                      { clubPlayerId: editClubPlayer.id },
                      pictureCallbacks('Previous picture restored'),
                    )
                  },
                  pending:
                    setPicture.isPending || removePicture.isPending || previousPicture.isPending,
                  error: pictureError,
                }
              : undefined
          }
          isPending={editPending}
          error={editError}
          onSave={(values) => void saveEdit(values)}
          onCancel={closeEdit}
        />
      ) : null}
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
      {noShowTarget ? (
        <ConfirmSheet
          open
          onOpenChange={(open) => {
            if (!open) setNoShowFor(null)
          }}
          title={`Mark ${queueMasterName(noShowTarget)} as No show?`}
          summary={
            <div className="flex flex-nowrap items-center gap-3">
              <Avatar name={queueMasterName(noShowTarget)} src={photoFor(noShowTarget)} />
              <div>
                <b>{queueMasterName(noShowTarget)}</b>
                <p className="text-[13px] text-fg2">Away · no games tonight</p>
              </div>
            </div>
          }
          consequence={
            <>
              They come off tonight's roster as <b>No show (cancelled)</b> and their slot opens
              {waitlist.length ? ' for the waitlist' : ''}. You can bring them back while a slot is
              free.
            </>
          }
          backLabel="Cancel"
          confirmLabel="Mark No show"
          destructive
          isPending={markNoShow.isPending}
          error={noShowError}
          onConfirm={() => confirmNoShow(noShowTarget)}
        />
      ) : null}
      <AddPlayer sessionId={sessionId} open={addOpen} onOpenChange={setAddOpen} />
    </div>
  )
}
