import type { PlayingLevel } from '@rotra/data/player/types'
import { Avatar } from '@rotra/ui/avatar'
import { cn } from '@rotra/ui/cn'
import { levelLabel } from '@rotra/ui/level-pill'
import type { Ref } from 'react'

export type MatchPlayerCardTeam = 'A' | 'B'

export type MatchPlayerCardProps = {
  /** Session player id */
  id: string
  /** Full name */
  name: string
  level: PlayingLevel | null
  photoUrl?: string
  /** Counted games so far this session */
  games: number
  /** The session's minimum games; "g/min games" turns amber below it */
  minimumGames: number
  team: MatchPlayerCardTeam
  /** Opens the player's profile (its footer returns to the dialog) */
  onClick: () => void
  /**
   * Wrapped in a SwappablePlayer (Queue › Match queue › switch sides by dragging): adds the arrow-key
   * hint to the accessible name. The wrapper owns the drag, the keys and the tooltip.
   */
  swappable?: boolean
  ref?: Ref<HTMLButtonElement>
  className?: string
}

/**
 * The prototype's .sg-p: a player on a match dialog (Suggested match, Start match, Active match,
 * Invalid match) with their picture or initials, name, level and games against the minimum. Tapping
 * it opens the profile.
 */
export function MatchPlayerCard({
  id,
  name,
  level,
  photoUrl,
  games,
  minimumGames,
  team,
  onClick,
  swappable = false,
  ref,
  className,
}: MatchPlayerCardProps) {
  const below = games < minimumGames
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      aria-label={`${name}, ${levelLabel(level)}, ${games} of ${minimumGames} games. View profile${swappable ? '. Left or right arrow switches sides' : ''}`}
      data-player-id={id}
      data-team={team}
      className={cn(
        'flex w-full min-w-0 items-center gap-2.5 rounded-lg border border-border bg-surface px-2.5 py-2 text-left text-fg',
        'hover:border-border-strong hover:bg-elev touch:min-h-16',
        'max-[480px]:flex-col max-[480px]:items-start',
        swappable && '[&_img]:[-webkit-user-drag:none]',
        className,
      )}
    >
      <Avatar name={name} src={photoUrl} size={52} className="text-[17px]" />
      <span className="flex min-w-0 max-w-full flex-col">
        <b className="truncate max-[480px]:whitespace-normal">{name}</b>
        <span className="text-[13px] leading-[1.35] text-fg2">{levelLabel(level)}</span>
        <span
          className={cn(
            'text-[13px] leading-[1.35] tabular-nums',
            below ? 'font-semibold text-warn' : 'text-fg2',
          )}
        >
          {games}/{minimumGames} games
        </span>
      </span>
    </button>
  )
}
