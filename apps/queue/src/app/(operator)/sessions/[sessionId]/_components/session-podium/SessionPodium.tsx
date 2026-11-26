'use client'

import { PodiumPlaceDialog } from '@rotra/ui/podium-place-dialog'
import { type PodiumPosition, TopThreePodium } from '@rotra/ui/top-three-podium'
import { useState } from 'react'

/** One standings row, already placed: same wins and losses share a position (1, 1, 2). */
export type SessionPodiumRow = {
  id: string
  /** Full name: leaderboards never mask it (D-2026-11-25-04) */
  name: string
  pictureUrl?: string | null
  position: number
  wins: number
  losses: number
  /** Counted games */
  games: number
  /** false: this player opens nothing even with onOpenPlayer */
  canOpen?: boolean
}

export type SessionPodiumProps = {
  /** Every standings row, best first; places 1 to 3 go on the podium */
  rows: readonly SessionPodiumRow[]
  /**
   * A one-player place, or a row in the Podium place dialog, opens that player. From the dialog,
   * `back` reopens it (the profile's Back to place). Omit for faces that open nothing.
   */
  onOpenPlayer?: (id: string, back?: () => void) => void
}

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`
const winRate = (wins: number, losses: number) =>
  wins + losses ? Math.round((wins / (wins + losses)) * 100) : 0

/**
 * The session's podium (rotra-queue.html `sessionPodium`): TopThreePodium over the same standings as
 * the table under it, captioned "This session · N players", each step "W W · L L"; a shared place
 * opens PodiumPlaceDialog ("Same wins and losses: 2 W and 1 L each.").
 */
export function SessionPodium({ rows, onOpenPlayer }: SessionPodiumProps) {
  const [place, setPlace] = useState<PodiumPosition | null>(null)
  const places = ([1, 2, 3] as const).map((position) => ({
    position,
    players: rows
      .filter((row) => row.position === position)
      .map((row) => ({
        id: row.id,
        name: row.name,
        pictureUrl: row.pictureUrl,
        canOpen: row.canOpen,
        stat: `${row.wins} W · ${row.losses} L`,
        statSpoken: `${plural(row.wins, 'win', 'wins')}, ${plural(row.losses, 'loss', 'losses')}`,
      })),
  }))
  const inPlace = place ? rows.filter((row) => row.position === place) : []
  const first = inPlace[0]
  return (
    <>
      <TopThreePodium
        places={places}
        caption={`This session · ${plural(rows.length, 'player', 'players')}`}
        onOpenPlayer={onOpenPlayer ? (id) => onOpenPlayer(id) : undefined}
        onOpenPlace={setPlace}
      />
      {place ? (
        <PodiumPlaceDialog
          open
          onOpenChange={(open) => {
            if (!open) setPlace(null)
          }}
          position={place}
          statLayout="inline"
          description={
            first ? `Same wins and losses: ${first.wins} W and ${first.losses} L each.` : undefined
          }
          players={inPlace.map((row) => ({
            id: row.id,
            name: row.name,
            pictureUrl: row.pictureUrl,
            canOpen: row.canOpen,
            stats: [
              { value: String(row.wins), label: 'W' },
              { value: String(row.losses), label: 'L' },
              { value: String(row.games), label: 'games' },
              { value: `${winRate(row.wins, row.losses)}%`, label: 'win rate' },
            ],
            statsSpoken: `${row.wins} won, ${row.losses} lost, ${plural(row.games, 'game', 'games')}, ${winRate(row.wins, row.losses)}% win rate`,
          }))}
          onOpenPlayer={
            onOpenPlayer
              ? (id) => {
                  const back = place
                  setPlace(null)
                  onOpenPlayer(id, () => setPlace(back))
                }
              : undefined
          }
        />
      ) : null}
    </>
  )
}
