import type { PlayingLevel } from '@rotra/data/player/types'
import { Avatar } from '@rotra/ui/avatar'
import { cn } from '@rotra/ui/cn'
import { levelLabel } from '@rotra/ui/level-pill'
import { PlayerNameBlock } from '@rotra/ui/player-name-block'
import { playerTileVariants } from './PlayerTile.variants'

export type PlayerTileStatus =
  /**
   * On a court: `courtLabel` is "Court 1", or "Court 1 + Court 2" for a merged 5v5. `gettingReady`
   * reads "On court · Court 1" (called to the court, not started); otherwise "Playing · Court 1".
   */
  | { kind: 'playing'; courtLabel: string; gettingReady?: boolean }
  /** Not present */
  | { kind: 'away' }
  /** Present and off court, resting for `minutes` since their last game ended (or since arriving) */
  | { kind: 'resting'; minutes: number }
  /** A note instead of the live status, e.g. "Already in this match" or "Team A" */
  | { kind: 'note'; text: string }

export type PlayerTileProps = {
  /** The full name: the last line of the name stack and the screen-reader name */
  name: string
  /** The player's own nickname (D-2026-11-26-09) */
  nickname?: string | null
  /** The club nickname (registered players only); the top name when present */
  clubNickname?: string | null
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
      return `${status.gettingReady ? 'On court' : 'Playing'} · ${status.courtLabel}`
    case 'away':
      return 'Not present'
    case 'resting':
      return `Resting ${status.minutes} min`
    case 'note':
      return status.text
  }
}

/** The picture's level ring (the prototype's .ptile.pt-ring); grey with no level. */
const ringOf = (level: PlayingLevel | null) =>
  level?.startsWith('beginner')
    ? 'outline-lv-beg'
    : level?.startsWith('intermediate')
      ? 'outline-lv-int'
      : level?.startsWith('advanced')
        ? 'outline-lv-adv'
        : 'outline-border-strong'

const STATE = { playing: 'busy', away: 'away', resting: 'fresh', note: 'note' } as const

/**
 * The prototype's .ptile.pt-ring: a large player tile for the slot picker and substitution. The
 * picture wears the level ring and the games badge (owner, November 26, 2026), so the level text and
 * "N/M" are not drawn; the level and "N of M games" stay in the accessible name. Then the name stack
 * (club nickname, nickname, full name) and a status line. Busy (playing) tiles read warn, resting
 * tiles accent, away tiles grey the picture; the pressed tile is the current choice.
 */
export function PlayerTile({
  name,
  nickname,
  clubNickname,
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
      aria-label={`${name}, ${levelLabel(level)}, ${games} of ${minimumGames} games, ${statusText(status)}`}
      className={cn(playerTileVariants({ state: STATE[status.kind] }), className)}
    >
      <span data-slot="picture" className="relative mb-1.5 flex">
        <Avatar
          name={name}
          src={photoUrl}
          size={64}
          className={cn('outline-3 outline-offset-2', ringOf(level))}
        />
        <span
          aria-hidden="true"
          className="absolute -top-1 -right-1.5 grid h-[22px] min-w-[22px] place-items-center rounded-full bg-on-photo/90 px-1 text-xs leading-none font-extrabold text-photo-label tabular-nums"
        >
          {games}
        </span>
      </span>
      <PlayerNameBlock
        layout="stack"
        fullName={name}
        nickname={nickname}
        clubNickname={clubNickname}
        labelClassName="text-sm leading-[1.25]"
        className="w-full"
      />
      <span data-slot="status" className="text-[11px] text-fg2">
        {statusText(status)}
      </span>
    </button>
  )
}
