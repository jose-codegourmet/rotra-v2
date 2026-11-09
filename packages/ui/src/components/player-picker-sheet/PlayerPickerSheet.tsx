'use client'

import type { PlayingLevel } from '@rotra/data/player/types'
import { Button } from '@rotra/ui/button'
import { EmptyState } from '@rotra/ui/empty-state'
import { Field } from '@rotra/ui/field'
import { PlayerTile, type PlayerTileStatus } from '@rotra/ui/player-tile'
import { SegmentedControl } from '@rotra/ui/segmented-control'
import { Sheet } from '@rotra/ui/sheet'
import { Tabs } from '@rotra/ui/tabs'
import { TextInput } from '@rotra/ui/text-input'
import { useState } from 'react'

/** One roster player as the picker (and the lineup form's filled slots) shows them. */
export type PlayerPickerCandidate = {
  /** The SessionPlayer id: what the lineup holds */
  id: string
  name: string
  nickname: string | null
  photoUrl?: string
  /** The level locked for this session; null when none was set */
  level: PlayingLevel | null
  /** Counted games so far */
  games: number
  present: boolean
  /** The court label ("Court 1", "Court 1 + Court 2") while playing; null when off court */
  playingOn: string | null
  /** Minutes since their last game ended (or since arriving); shown for present, off-court players */
  restMinutes: number
}

export type PlayerPickerFilter = 'available' | 'present' | 'everyone'

export type PlayerPickerLineupProps = {
  /** The Q-PICK-PLAYER sheet the Queue Master uses; the default */
  variant?: 'lineup'
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The slot being filled: "Choose Team A · player N" */
  team: 'A' | 'B'
  /** 0-based slot index on that team */
  slotIndex: number
  /** The roster in the order it should appear (fewest games first, from the queue rules) */
  players: PlayerPickerCandidate[]
  /** The session's minimum games */
  minimumGames: number
  /** The player currently in this slot, shown pressed */
  currentId?: string | null
  /** Players already in another slot of this match: disabled with "Already in this match" */
  takenIds?: string[]
  /** Opening filter; Available now by default */
  initialFilter?: PlayerPickerFilter
  onChoose: (playerId: string) => void
  /** "Back to lineup": closes without choosing; focus returns to the slot that opened the picker */
  onBack: () => void
}

/** One present player as the match-request picker shows them (the viewer is left out by the caller). */
export type MatchRequestCandidate = {
  /** The SessionPlayer id */
  id: string
  name: string
  photoUrl?: string
  /** The level locked for this session; null when none was set. Its group is the part before "_". */
  level: PlayingLevel | null
  /** Counted games so far */
  games: number
  /** The court label while playing; null when off court */
  playingOn: string | null
  /** Minutes since their last game ended (or since arriving): the waiting time */
  restMinutes: number
}

export type MatchRequestShow = 'all' | 'playing' | 'available'
export type MatchRequestSkill = 'all' | 'beginner' | 'intermediate' | 'advanced'
export type MatchRequestSort = 'waitDesc' | 'waitAsc' | 'gamesAsc' | 'gamesDesc'

export type PlayerPickerMatchRequestProps = {
  /** Q-PUBLIC-DETAILS (My night › Request a match): choosing a partner or an opponent */
  variant: 'matchRequest'
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The spot being filled, as the request sheet names it: "Partner", "Opponent 1", ... */
  spotLabel: string
  /** Present players other than the viewer, in any order; the sheet sorts them */
  players: MatchRequestCandidate[]
  /** The session's minimum games */
  minimumGames: number
  /** The player already in this spot, shown pressed */
  currentId?: string | null
  /** Players already picked for other spots: disabled with "Already picked" */
  pickedIds?: string[]
  /** Opening choices; All, All levels and Fewest games by default */
  initialShow?: MatchRequestShow
  initialSkill?: MatchRequestSkill
  initialSort?: MatchRequestSort
  onChoose: (playerId: string) => void
  /** "Anyone": leaves the spot open */
  onAnyone: () => void
  /** "Back": closes without choosing */
  onBack: () => void
}

export type PlayerPickerSheetProps = PlayerPickerLineupProps | PlayerPickerMatchRequestProps

const FILTERS: { value: PlayerPickerFilter; label: string }[] = [
  { value: 'available', label: 'Available now' },
  { value: 'present', label: 'All present' },
  { value: 'everyone', label: 'Everyone' },
]

function matchesFilter(p: PlayerPickerCandidate, filter: PlayerPickerFilter) {
  if (filter === 'available') return p.present && p.playingOn === null
  if (filter === 'present') return p.present
  return true
}

function statusOf(p: PlayerPickerCandidate): PlayerTileStatus {
  if (p.playingOn !== null) return { kind: 'playing', courtLabel: p.playingOn }
  if (!p.present) return { kind: 'away' }
  return { kind: 'resting', minutes: p.restMinutes }
}

/**
 * Q-PICK-PLAYER: "Choose Team A · player N". Search by name or nickname, the Available now / All
 * present / Everyone filter, and a grid of PlayerTiles. Players already in another slot are disabled
 * with "Already in this match". The order of `players` is the caller's (queue rules); the sheet only
 * applies the filter and the search.
 */
function LineupPicker({
  open,
  onOpenChange,
  team,
  slotIndex,
  players,
  minimumGames,
  currentId = null,
  takenIds = [],
  initialFilter = 'available',
  onChoose,
  onBack,
}: PlayerPickerLineupProps) {
  const [filter, setFilter] = useState<PlayerPickerFilter>(initialFilter)
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const list = players.filter(
    (p) =>
      matchesFilter(p, filter) &&
      (!q || p.name.toLowerCase().includes(q) || p.nickname?.toLowerCase().includes(q)),
  )

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={`Choose Team ${team} · player ${slotIndex + 1}`}
      footer={<Button onClick={onBack}>Back to lineup</Button>}
    >
      <Field label="Search players">
        <TextInput
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Name or nickname"
          autoComplete="off"
          autoFocus
        />
      </Field>
      <SegmentedControl
        aria-label="Show"
        options={FILTERS}
        value={filter}
        onChange={(value) => setFilter(value as PlayerPickerFilter)}
      />
      {list.length ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,128px),1fr))] gap-2.5">
          {list.map((p) => {
            const taken = p.id !== currentId && takenIds.includes(p.id)
            return (
              <PlayerTile
                key={p.id}
                name={p.name}
                photoUrl={p.photoUrl}
                level={p.level}
                games={p.games}
                minimumGames={minimumGames}
                status={taken ? { kind: 'note', text: 'Already in this match' } : statusOf(p)}
                pressed={p.id === currentId}
                disabled={taken}
                onClick={() => onChoose(p.id)}
              />
            )
          })}
        </div>
      ) : (
        <EmptyState>
          {filter === 'available'
            ? 'No one is free right now. Try All present.'
            : 'No player matches.'}
        </EmptyState>
      )}
      <p className="m-0 text-[13px] text-fg2">
        Fewest games first. A player who is playing now can go into a later match, but it can't
        start until they're free.
      </p>
    </Sheet>
  )
}

const SHOW_TABS: { value: MatchRequestShow; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'playing', label: 'Playing' },
  { value: 'available', label: 'Available' },
]

const SKILLS: { value: MatchRequestSkill; label: string }[] = [
  { value: 'all', label: 'All levels' },
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
]

const SORTS: { value: MatchRequestSort; label: string; name: string }[] = [
  { value: 'waitDesc', label: '↓ Longest wait', name: 'Waiting time, longest first' },
  { value: 'waitAsc', label: '↑ Shortest wait', name: 'Waiting time, shortest first' },
  { value: 'gamesAsc', label: '↑ Fewest games', name: 'Games played, fewest first' },
  { value: 'gamesDesc', label: '↓ Most games', name: 'Games played, most first' },
]

const SORTERS: Record<
  MatchRequestSort,
  (a: MatchRequestCandidate, b: MatchRequestCandidate) => number
> = {
  waitDesc: (a, b) => b.restMinutes - a.restMinutes,
  waitAsc: (a, b) => a.restMinutes - b.restMinutes,
  gamesAsc: (a, b) => a.games - b.games,
  gamesDesc: (a, b) => b.games - a.games,
}

/**
 * The match-request "Choose partner / opponent" sheet: All / Playing / Available tabs with counts,
 * a skill-group filter, a sort, and a grid of PlayerTiles. Players already picked for another spot
 * are disabled with "Already picked". The choices live here and reset when the sheet unmounts.
 */
function MatchRequestPicker({
  open,
  onOpenChange,
  spotLabel,
  players,
  minimumGames,
  currentId = null,
  pickedIds = [],
  initialShow = 'all',
  initialSkill = 'all',
  initialSort = 'gamesAsc',
  onChoose,
  onAnyone,
  onBack,
}: PlayerPickerMatchRequestProps) {
  const [show, setShow] = useState<MatchRequestShow>(initialShow)
  const [skill, setSkill] = useState<MatchRequestSkill>(initialSkill)
  const [sort, setSort] = useState<MatchRequestSort>(initialSort)
  const playing = players.filter((p) => p.playingOn !== null).length
  const counts: Record<MatchRequestShow, number> = {
    all: players.length,
    playing,
    available: players.length - playing,
  }
  const list = players
    .filter(
      (p) =>
        (show === 'playing'
          ? p.playingOn !== null
          : show === 'available'
            ? p.playingOn === null
            : true) &&
        (skill === 'all' || p.level?.split('_')[0] === skill),
    )
    .sort(SORTERS[sort])

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={`Choose ${spotLabel}`}
      footer={
        <>
          <Button onClick={onAnyone}>Anyone</Button>
          <Button onClick={onBack}>Back</Button>
        </>
      }
    >
      <div className="flex flex-col gap-2.5">
        <Tabs
          aria-label="Show players"
          items={SHOW_TABS.map((t) => ({
            value: t.value,
            label: `${t.label} · ${counts[t.value]}`,
          }))}
          value={show}
          onChange={(value) => setShow(value as MatchRequestShow)}
        />
        <div className="flex flex-wrap items-center gap-2.5">
          <SegmentedControl
            aria-label="Filter by skill"
            options={SKILLS}
            value={skill}
            onChange={(value) => setSkill(value as MatchRequestSkill)}
          />
          <SegmentedControl
            aria-label="Sort players"
            // iconOnly is how SegmentedControl names a pill and gives it a tooltip; the span puts the
            // text pills' usual padding back.
            options={SORTS.map((o) => ({
              value: o.value,
              iconOnly: true,
              ariaLabel: o.name,
              label: <span className="px-1 touch:px-1.5">{o.label}</span>,
            }))}
            value={sort}
            onChange={(value) => setSort(value as MatchRequestSort)}
          />
        </div>
      </div>
      {list.length ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,128px),1fr))] gap-2.5">
          {list.map((p) => {
            const picked = p.id !== currentId && pickedIds.includes(p.id)
            return (
              <PlayerTile
                key={p.id}
                name={p.name}
                photoUrl={p.photoUrl}
                level={p.level}
                games={p.games}
                minimumGames={minimumGames}
                status={
                  picked
                    ? { kind: 'note', text: 'Already picked' }
                    : p.playingOn !== null
                      ? { kind: 'playing', courtLabel: p.playingOn }
                      : { kind: 'resting', minutes: p.restMinutes }
                }
                pressed={p.id === currentId}
                disabled={picked}
                onClick={() => onChoose(p.id)}
              />
            )
          })}
        </div>
      ) : (
        <EmptyState>No other present players.</EmptyState>
      )}
      <p className="m-0 text-[13px] text-fg2">
        Present players only. Players on a court or already in a waiting match can still be picked.
      </p>
    </Sheet>
  )
}

/**
 * Q-PICK-PLAYER for the Queue Master (default variant) or the match-request partner / opponent
 * picker (`variant="matchRequest"`).
 */
export function PlayerPickerSheet(props: PlayerPickerSheetProps) {
  return props.variant === 'matchRequest' ? (
    <MatchRequestPicker {...props} />
  ) : (
    <LineupPicker {...props} />
  )
}
