import type { PlayingLevel } from '@rotra/data/player/types'
import { Avatar } from '@rotra/ui/avatar'
import { cn } from '@rotra/ui/cn'
import { Icon } from '@rotra/ui/icon'
import { levelLabel } from '@rotra/ui/level-pill'
import { PlayerNameBlock } from '@rotra/ui/player-name-block'
import type { Ref } from 'react'

export type MatchPlayerCardTeam = 'A' | 'B'

export type MatchPlayerCardProps = {
  /** Session player id */
  id: string
  /** Full name */
  name: string
  /** The player's own nickname; with `clubNickname` it turns on the name stack (D-2026-11-26-09) */
  nickname?: string | null
  /** The club nickname (registered players only) */
  clubNickname?: string | null
  level: PlayingLevel | null
  photoUrl?: string
  /** Counted games so far this session */
  games: number
  /** The session's minimum games; "g/min games" turns amber below it */
  minimumGames: number
  team: MatchPlayerCardTeam
  /**
   * What tapping the card does. Default variant: opens the player's profile (its footer returns to
   * the dialog). Swappable variant: brings in someone from outside (Substitute or Replace on a
   * Playing match, Replace player on a Getting ready one).
   */
  onClick: () => void
  /**
   * "default": the whole card is one button that opens the profile. "swappable": the picture is its
   * own button (onOpenProfile) and the card is a second button with a swap icon (onClick); the two
   * are siblings, never nested. Used on Open match (Playing and Getting ready).
   */
  variant?: 'default' | 'swappable'
  /** Swappable variant: opens the player's profile from the picture */
  onOpenProfile?: () => void
  /**
   * Wrapped in a SwappablePlayer (Queue › Match queue › switch sides by dragging): adds the arrow-key
   * hint to the accessible name. The wrapper owns the drag, the keys and the tooltip.
   */
  swappable?: boolean
  /** What a tap does, ending the accessible name: "View profile" by default ("Substitute or replace" on a Playing match) */
  actionLabel?: string
  ref?: Ref<HTMLButtonElement>
  className?: string
}

/** The 3 px level-band ring on the picture (prototype .sg-p.lv-*); grey with no level. */
function levelRingClass(level: PlayingLevel | null) {
  const color = level?.startsWith('beginner')
    ? 'outline-lv-beg'
    : level?.startsWith('intermediate')
      ? 'outline-lv-int'
      : level?.startsWith('advanced')
        ? 'outline-lv-adv'
        : 'outline-border-strong'
  return cn('outline-3 outline-offset-2', color)
}

/**
 * The prototype's .sg-p: a player on a match dialog (Suggested match, Start match, Active match,
 * Invalid match) with their picture or initials, name and games against the minimum. The level shows
 * as the picture's ring and in the hover title and screen-reader label, not as text. Tapping the
 * card opens the profile; the swappable variant splits it into a picture button (profile) and a card
 * button (swap in someone from outside).
 */
export function MatchPlayerCard({
  id,
  name,
  nickname,
  clubNickname,
  level,
  photoUrl,
  games,
  minimumGames,
  team,
  onClick,
  variant = 'default',
  onOpenProfile,
  swappable = false,
  actionLabel = 'View profile',
  ref,
  className,
}: MatchPlayerCardProps) {
  const below = games < minimumGames
  const label = `${name}, ${levelLabel(level)}, ${games} of ${minimumGames} games. ${actionLabel}${swappable ? '. Left or right arrow switches sides' : ''}`
  const avatar = (
    <Avatar
      name={name}
      src={photoUrl}
      size={52}
      className={cn('text-[17px]', levelRingClass(level))}
    />
  )
  const facts = (
    <span className="flex min-w-0 max-w-full flex-col">
      {nickname !== undefined || clubNickname !== undefined ? (
        <PlayerNameBlock
          layout="stack"
          fullName={name}
          nickname={nickname}
          clubNickname={clubNickname}
          labelClassName="font-bold"
        />
      ) : (
        <b className="truncate max-[480px]:whitespace-normal">{name}</b>
      )}
      <span
        className={cn(
          'text-[13px] leading-[1.35] tabular-nums',
          below ? 'font-semibold text-warn' : 'text-fg2',
        )}
      >
        {games}/{minimumGames} games
      </span>
    </span>
  )

  if (variant === 'swappable') {
    return (
      <div
        data-player-id={id}
        data-team={team}
        title={levelLabel(level)}
        className={cn(
          'group/card relative flex w-full min-w-0 items-center gap-2.5 rounded-lg border border-border bg-surface py-2 pr-2.5 pl-3 text-fg',
          'hover:border-border-strong hover:bg-elev touch:min-h-16',
          'max-[480px]:flex-col max-[480px]:items-start',
          '[&_img]:[-webkit-user-drag:none]',
          className,
        )}
      >
        <button
          type="button"
          onClick={onOpenProfile}
          aria-label={`View ${name}'s profile`}
          title="View profile"
          className="group/face relative z-10 shrink-0 cursor-pointer rounded-full focus-visible:outline-2 focus-visible:outline-offset-6 focus-visible:outline-accent hover:[&>*]:shadow-[0_0_0_6px_color-mix(in_srgb,var(--accent)_35%,transparent)]"
        >
          {avatar}
        </button>
        <button
          ref={ref}
          type="button"
          onClick={onClick}
          aria-label={label}
          title={actionLabel}
          className="flex min-w-0 flex-1 cursor-pointer items-center justify-between gap-2 text-left max-[480px]:w-full after:absolute after:inset-0 after:rounded-lg focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-accent"
        >
          {facts}
          <Icon
            name="substitute"
            size={18}
            className="shrink-0 text-fg3 group-hover/card:text-accent"
          />
        </button>
      </div>
    )
  }

  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      aria-label={label}
      title={levelLabel(level)}
      data-player-id={id}
      data-team={team}
      className={cn(
        'flex w-full min-w-0 items-center gap-2.5 rounded-lg border border-border bg-surface py-2 pr-2.5 pl-3 text-left text-fg',
        'hover:border-border-strong hover:bg-elev touch:min-h-16',
        'max-[480px]:flex-col max-[480px]:items-start',
        swappable && '[&_img]:[-webkit-user-drag:none]',
        className,
      )}
    >
      {avatar}
      {facts}
    </button>
  )
}
