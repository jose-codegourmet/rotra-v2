import type { PlayingLevel } from '@rotra/data/player/types'
import { Avatar } from '@rotra/ui/avatar'
import { cn } from '@rotra/ui/cn'
import { levelLabel } from '@rotra/ui/level-pill'
import type { KeyboardEvent } from 'react'

export type PlayerFaceButtonProps = {
  /** Full name, for the title and the picture's description */
  name: string
  /** Nickname or first name, shown under the picture */
  shortName: string
  level: PlayingLevel | null
  photoUrl?: string
  /** Accessible name, e.g. "Kat Reyes, Team A. View profile" */
  label: string
  /**
   * Picture size. Courts shrink with the team size (34 → 28 → 24, the prototype's .pf / .side.nN);
   * queue cards use 28, 40 on touch (.qf).
   */
  size?: 34 | 28 | 24 | 'queue'
  /** Narrower name pill for 4v4 and 5v5 sides (.side.n4 .pf-n) */
  compact?: boolean
  /** Opens the player's profile */
  onClick: () => void
  /**
   * Switch sides (Queue › Match queue): the hint joins the title and accessible name. With onSwap,
   * the left or right arrow calls it; without, the enclosing SwappablePlayer handles the keys.
   */
  swap?: { team: 'A' | 'B'; index: number; onSwap?: () => void }
  className?: string
}

const PICTURE = {
  34: { size: 36, className: 'size-[34px] text-xs' },
  28: { size: 28, className: '' },
  24: { size: 24, className: '' },
  queue: { size: 28, className: 'touch:size-10 touch:text-sm' },
} as const

/**
 * The prototypes' .pf / .qf: a player's picture with a short name under it, on a court drawing or a
 * queue card. Tapping it opens the profile.
 */
export function PlayerFaceButton({
  name,
  shortName,
  level,
  photoUrl,
  label,
  size = 34,
  compact = false,
  onClick,
  swap,
  className,
}: PlayerFaceButtonProps) {
  const picture = PICTURE[size]
  const onSwap = swap?.onSwap
  const onKeyDown = onSwap
    ? (e: KeyboardEvent<HTMLButtonElement>) => {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          e.preventDefault()
          onSwap()
        }
      }
    : undefined
  return (
    <button
      type="button"
      onClick={onClick}
      onKeyDown={onKeyDown}
      title={`${name} · ${levelLabel(level)}${swap ? ' · drag onto the other team to switch sides' : ''}`}
      aria-label={`${label}${swap ? '. Left or right arrow switches sides' : ''}`}
      data-team={swap?.team}
      data-i={swap?.index}
      className={cn(
        'group/face m-0 flex min-w-0 flex-col items-center gap-px rounded-md border-0 bg-transparent p-0',
        size === 'queue' && '-m-0.5 rounded-lg p-0.5 touch:p-1',
        className,
      )}
    >
      <Avatar
        name={name}
        src={photoUrl}
        size={picture.size}
        className={cn(
          'ring-2 ring-on-photo/90 group-hover/face:ring-accent',
          size === 'queue' && 'ring-0 group-hover/face:ring-2',
          picture.className,
        )}
      />
      <span
        className={cn(
          'max-w-16 truncate rounded-full bg-photo-label px-[5px] text-[10px] leading-[1.3] font-bold text-on-photo',
          compact && 'max-w-[46px]',
          size === 'queue' &&
            'bg-transparent px-0 text-[11px] leading-normal text-fg touch:text-xs',
        )}
      >
        {shortName}
      </span>
    </button>
  )
}
