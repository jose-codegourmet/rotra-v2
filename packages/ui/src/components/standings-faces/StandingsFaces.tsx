import { Avatar } from '@rotra/ui/avatar'
import { cn } from '@rotra/ui/cn'
import type { ReactNode } from 'react'

/** Counted games of a standings row: one number, or the range when the players inside it differ. */
export type StandingsGames = number | { min: number; max: number }

/** "5" or "5–6" (the prototype's groupGames()). */
export function formatStandingsGames(games: StandingsGames) {
  if (typeof games === 'number') return String(games)
  return games.min === games.max ? String(games.min) : `${games.min}–${games.max}`
}

/** One face of a standings row. Without onOpen the face is plain (masked or private players). */
export type StandingsFace = {
  id: string
  name: string
  pictureUrl?: string | null
  /** Opens this player's profile */
  onOpen?: () => void
}

export type StandingsFacesProps = {
  faces: StandingsFace[]
  /** The face's size in px (the prototype uses 36 on the console and 28 on the session page) */
  size?: 28 | 36
  /** The profile button's accessible name; defaults to "View NAME's profile" */
  profileLabel?: (name: string) => string
  className?: string
}

/**
 * The prototype's .lb-stack: a shared standings position shows its players' faces overlapping,
 * the first on top, each ringed in the surface colour; hovering or focusing a face lifts it. Each
 * face with onOpen is its own profile button. Wraps onto a second line for a big tie.
 */
export function StandingsFaces({
  faces,
  size = 36,
  profileLabel = (name) => `View ${name}'s profile`,
  className,
}: StandingsFacesProps) {
  return (
    <span className={cn('inline-flex flex-none flex-wrap items-center gap-y-1 pl-2.5', className)}>
      {faces.map((face, index) => {
        const avatar = (
          <Avatar key={face.id} name={face.name} src={face.pictureUrl ?? undefined} size={size} />
        )
        const ring = '-ml-2.5 relative rounded-full shadow-[0_0_0_2px_var(--surface)]'
        const style = { zIndex: Math.max(1, 6 - index) }
        return face.onOpen ? (
          <button
            key={face.id}
            type="button"
            onClick={face.onOpen}
            aria-label={profileLabel(face.name)}
            title={face.name}
            style={style}
            className={cn(
              ring,
              'm-0 flex-none cursor-pointer border-0 bg-surface p-0 leading-none',
              'hover:z-[7] hover:shadow-[0_0_0_2px_var(--accent)] focus-visible:z-[7] focus-visible:shadow-[0_0_0_2px_var(--accent)] focus-visible:outline-none',
            )}
          >
            {avatar}
          </button>
        ) : (
          <span
            key={face.id}
            style={style}
            className={cn(ring, 'flex-none bg-surface leading-none')}
          >
            {avatar}
          </span>
        )
      })}
    </span>
  )
}

export type StandingsPlayerCellProps = {
  faces: StandingsFace[]
  size?: 28 | 36
  profileLabel?: (name: string) => string
  /** Every name of the position, in order (the prototype's tiedNames(): joined with commas) */
  names: ReactNode
  /** A line under the names (the console's levels) */
  detail?: ReactNode
  className?: string
}

/**
 * The Player cell of a standings row (.lb-p / .lb-who): one player puts the face beside the name;
 * a shared position puts the stacked faces over the names. Names wrap anywhere so a long one never
 * pushes into the W / L / Games columns.
 */
export function StandingsPlayerCell({
  faces,
  size,
  profileLabel,
  names,
  detail,
  className,
}: StandingsPlayerCellProps) {
  const tied = faces.length > 1
  return (
    <span
      className={cn(
        'flex min-w-0 gap-2.5',
        tied ? 'flex-col items-start gap-1' : 'items-center',
        className,
      )}
    >
      <StandingsFaces faces={faces} size={size} profileLabel={profileLabel} />
      <span className="min-w-0 [overflow-wrap:anywhere]">
        {names}
        {detail}
      </span>
    </span>
  )
}
