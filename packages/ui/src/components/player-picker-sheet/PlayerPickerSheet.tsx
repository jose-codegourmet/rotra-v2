'use client'

import type { PlayingLevel } from '@rotra/data/player/types'
import { Button } from '@rotra/ui/button'
import { EmptyState } from '@rotra/ui/empty-state'
import { Field } from '@rotra/ui/field'
import { PlayerTile, type PlayerTileStatus } from '@rotra/ui/player-tile'
import { SegmentedControl } from '@rotra/ui/segmented-control'
import { Sheet } from '@rotra/ui/sheet'
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

export type PlayerPickerSheetProps = {
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
export function PlayerPickerSheet({
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
}: PlayerPickerSheetProps) {
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
          {filter === 'available' ? 'No one is free right now. Try All present.' : 'No player matches.'}
        </EmptyState>
      )}
      <p className="m-0 text-[13px] text-fg2">
        Fewest games first. A player who is playing now can go into a later match, but it can't start
        until they're free.
      </p>
    </Sheet>
  )
}
