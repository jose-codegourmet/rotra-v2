import type { PlayingLevel } from '@rotra/data/player/types'
import { Avatar } from '@rotra/ui/avatar'
import { cn } from '@rotra/ui/cn'

export type PairFacesPlayer = {
  name: string
  /** Nickname or first name: "Danna" */
  shortName: string
  level: PlayingLevel | null
  photoUrl?: string
}

export type PairFacesProps = {
  players: PairFacesPlayer[]
  className?: string
}

const ringOf = (level: PlayingLevel | null) =>
  level?.startsWith('beginner')
    ? 'outline-lv-beg'
    : level?.startsWith('intermediate')
      ? 'outline-lv-int'
      : level?.startsWith('advanced')
        ? 'outline-lv-adv'
        : 'outline-lv-none'

/**
 * One pair read only (the prototype's nePair(), owner, November 25, 2026): overlapping 26 px
 * pictures with the level ring, then the short names joined by "&" ("Danna & Darryn"). Used on a
 * free court's Next eligible line.
 */
export function PairFaces({ players, className }: PairFacesProps) {
  return (
    <span className={cn('inline-flex min-w-0 items-center gap-2', className)}>
      <span aria-hidden="true" className="flex flex-none pl-1.5">
        {players.map((p) => (
          <Avatar
            key={`${p.name}-${p.shortName}`}
            name={p.name}
            src={p.photoUrl}
            size={28}
            className={cn(
              '-ml-1.5 size-[26px] text-[10px] outline-2 outline-offset-0 shadow-[0_0_0_2px_var(--surface)]',
              ringOf(p.level),
            )}
          />
        ))}
      </span>
      <span className="min-w-0">{players.map((p) => p.shortName).join(' & ')}</span>
    </span>
  )
}
