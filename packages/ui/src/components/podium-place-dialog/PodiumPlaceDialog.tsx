'use client'

import { Avatar } from '@rotra/ui/avatar'
import { Button } from '@rotra/ui/button'
import { cn } from '@rotra/ui/cn'
import { Sheet } from '@rotra/ui/sheet'
import type { ReactNode } from 'react'

export type PodiumPlaceStat = {
  /** "7", "88%": shown before the label, bold in the inline layout */
  value: string
  /** "W", "games", "win rate" */
  label: string
}

export type PodiumPlacePlayer = {
  id: string
  /** Full name: leaderboards never mask it (D-2026-11-25-04) */
  name: string
  nickname?: string | null
  pictureUrl?: string | null
  initials?: string
  /** The player's club, under the name (the Queue ROTRA board) */
  club?: string
  /** Chips after the name: You, Not registered yet */
  tags?: ReactNode
  /** The right-side record, e.g. [7 wins, 88% win rate] or [2 W, 1 L, 3 games, 67% win rate] */
  stats: readonly PodiumPlaceStat[]
  /** The record read out, when the stats don't read well joined ("2 won, 1 lost, 3 games, 67% win rate") */
  statsSpoken?: string
  /** false: this row is plain even with onOpenPlayer (a profile the viewer may not open) */
  canOpen?: boolean
}

export type PodiumPlaceDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  position: 1 | 2 | 3
  /** Everyone in this place, in the list's order */
  players: readonly PodiumPlacePlayer[]
  /**
   * The muted line under the title: "Same wins and win rate: 7 wins and 88% each this week." /
   * "Same wins and losses: 2 W and 1 L each."
   */
  description?: ReactNode
  /**
   * `stacked` (ROTRA Player): the first stat bold over the others, muted. `inline` (Queue): every
   * stat on one line, its number bold ("2 W · 1 L · 3 games · 67% win rate").
   */
  statLayout?: 'stacked' | 'inline'
  /** A row opens that player's profile. Omit for plain rows. */
  onOpenPlayer?: (id: string) => void
}

const PLACE_SHORT = { 1: '1st', 2: '2nd', 3: '3rd' } as const

/**
 * Q-PODIUM-PLACE / P-LEADERBOARD shared place dialog (rotra-queue.html sheet `podiumPlace`,
 * rotra-player.html `lbPlaceSheet`): everyone who shares one podium place, and Close.
 */
export function PodiumPlaceDialog({
  open,
  onOpenChange,
  position,
  players,
  description,
  statLayout = 'stacked',
  onOpenPlayer,
}: PodiumPlaceDialogProps) {
  const count = players.length
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={`${PLACE_SHORT[position]} place · ${count} ${count === 1 ? 'player' : 'players'}`}
      footer={<Button onClick={() => onOpenChange(false)}>Close</Button>}
    >
      {description ? <p className="m-0 text-[13px] text-fg2">{description}</p> : null}
      {count ? (
        <div className="flex flex-col divide-y divide-border">
          {players.map((player) => (
            <PlaceRow
              key={player.id}
              player={player}
              statLayout={statLayout}
              onOpen={
                onOpenPlayer && player.canOpen !== false ? () => onOpenPlayer(player.id) : undefined
              }
            />
          ))}
        </div>
      ) : (
        <p className="m-0 py-6 text-center text-fg2">No one is in this place now.</p>
      )}
    </Sheet>
  )
}

function PlaceRow({
  player,
  statLayout,
  onOpen,
}: {
  player: PodiumPlacePlayer
  statLayout: 'stacked' | 'inline'
  onOpen?: () => void
}) {
  const stacked = statLayout === 'stacked'
  // A button carries the whole row in its name; a plain row reads its record as text.
  const hideStats = onOpen ? true : undefined
  const spoken =
    player.statsSpoken ?? player.stats.map((stat) => `${stat.value} ${stat.label}`).join(', ')
  const inner = (
    <>
      <Avatar
        name={player.name}
        src={player.pictureUrl ?? undefined}
        initials={player.initials}
        size={stacked ? 52 : 40}
      />
      <span className="flex min-w-0 flex-col gap-0.5">
        <b className="[overflow-wrap:anywhere]">{player.name}</b>
        {player.nickname ? <span className="text-[13px] text-fg2">“{player.nickname}”</span> : null}
        {player.club ? <span className="text-[13px] text-fg2">{player.club}</span> : null}
        {player.tags ? <span className="flex flex-wrap gap-1.5">{player.tags}</span> : null}
      </span>
      {stacked ? (
        <span
          aria-hidden={hideStats}
          className="flex flex-none flex-col items-end gap-0.5 text-right"
        >
          {player.stats.map((stat, index) =>
            index === 0 ? (
              <b key={stat.label} className="text-sm tabular-nums">
                {stat.value} {stat.label}
              </b>
            ) : (
              <span key={stat.label} className="text-[13px] text-fg2 tabular-nums">
                {stat.value} {stat.label}
              </span>
            ),
          )}
        </span>
      ) : (
        <span
          aria-hidden={hideStats}
          className="col-start-2 flex flex-wrap gap-x-3 gap-y-1 text-[13px] text-fg2 tabular-nums min-[421px]:col-start-3 min-[421px]:justify-end min-[421px]:text-right"
        >
          {player.stats.map((stat) => (
            <span key={stat.label}>
              <b className="text-fg">{stat.value}</b> {stat.label}
            </span>
          ))}
        </span>
      )}
    </>
  )
  const className = cn(
    'grid w-full min-h-14 items-center gap-3 border-0 bg-transparent text-left text-inherit [font:inherit]',
    stacked
      ? 'grid-cols-[52px_minmax(0,1fr)_auto] py-2.5'
      : 'grid-cols-[40px_minmax(0,1fr)] rounded-md p-2 min-[421px]:grid-cols-[40px_minmax(0,1fr)_auto]',
  )
  const label = `${player.name}${player.club ? `, ${player.club}` : ''}${spoken ? `, ${spoken}` : ''}`
  return onOpen ? (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${label}. View profile`}
      className={cn(
        className,
        'cursor-pointer hover:bg-elev focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent',
      )}
    >
      {inner}
    </button>
  ) : (
    <div className={className}>{inner}</div>
  )
}
