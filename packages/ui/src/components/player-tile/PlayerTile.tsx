import type { PlayingLevel } from '@rotra/data/player/types'
import { Avatar } from '@rotra/ui/avatar'
import { cn } from '@rotra/ui/cn'
import { levelLabel } from '@rotra/ui/level-pill'
import { playerTileVariants } from './PlayerTile.variants'

export type PlayerTileStatus =
  /** On court: `courtLabel` is "Court 1", or "Court 1 + Court 2" for a merged 5v5 */
  | { kind: 'playing'; courtLabel: string }
  /** Not present */
  | { kind: 'away' }
  /** Present and off court, resting for `minutes` since their last game ended (or since arriving) */
  | { kind: 'resting'; minutes: number }
  /** A note instead of the live status, e.g. "Already in this match" or "Team A" */
  | { kind: 'note'; text: string }

export type PlayerTileProps = {
  name: string
  photoUrl?: string
  /** The level locked for this session; null when none was set */
  level: PlayingLevel | null
  /** Counted games so far */
  games: number
  /** The session's minimum games */
  minimumGames: number
  status: PlayerTileStatus
  /** The tile is the current choice (aria-pressed) */
  pressed?: boolean
  /** Cannot be chosen, e.g. already in another slot of this match */
  disabled?: boolean
  onClick: () => void
  className?: string
}

function statusText(status: PlayerTileStatus) {
  switch (status.kind) {
    case 'playing':
      return `Playing · ${status.courtLabel}`
    case 'away':
      return 'Not present'
    case 'resting':
      return `Resting ${status.minutes} min`
    case 'note':
      return status.text
  }
}

const STATE = { playing: 'busy', away: 'away', resting: 'fresh', note: 'note' } as const

/**
 * The prototype's .ptile: a large player tile for the slot picker and substitution. Picture, name,
 * level, games against the minimum and a status line. Busy (playing) tiles read warn, resting tiles
 * accent, away tiles grey the picture; the pressed tile is the current choice.
 */
export function PlayerTile({
  name,
  photoUrl,
  level,
  games,
  minimumGames,
  status,
  pressed = false,
  disabled = false,
  onClick,
  className,
}: PlayerTileProps) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
      className={cn(playerTileVariants({ state: STATE[status.kind] }), className)}
    >
      <span data-slot="picture" className="mb-1 flex">
        <Avatar
          name={name}
          src={photoUrl}
          size={64}
          className={cn(
            photoUrl && 'shadow-[0_0_0_2px_var(--surface),0_0_0_3px_var(--border-strong)]',
          )}
        />
      </span>
      <span className="text-sm leading-[1.25] font-bold [overflow-wrap:anywhere]">{name}</span>
      <span className="text-[11px] leading-[1.3] text-fg2">{levelLabel(level)}</span>
      <span className="text-xs tabular-nums">
        {games}/{minimumGames} games
      </span>
      <span data-slot="status" className="text-[11px] text-fg2">
        {statusText(status)}
      </span>
    </button>
  )
}
