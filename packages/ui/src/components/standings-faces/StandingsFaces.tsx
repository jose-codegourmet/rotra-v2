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

/**
 * The names of a shared position (the prototype's tiedNames()): "A & B" for two, "A, B, C" for
 * three or more (owner, November 25, 2026).
 */
export function tiedNames(names: readonly string[]) {
  return names.join(names.length === 2 ? ' & ' : ', ')
}

/** One face of a standings row. Without onOpen the face is plain (masked or private players). */
export type StandingsFace = {
  id: string
  name: string
  pictureUrl?: string | null
  /** Opens this player's profile */
  onOpen?: () => void
  /**
   * The level band drawn as a 3 px ring around the picture (Beginner, Intermediate, Advanced; none
   * is grey). Leave it out for no ring (the session record's Results tab).
   */
  band?: StandingsFaceBand
}

export type StandingsFaceBand = 'beginner' | 'intermediate' | 'advanced' | 'none'

const BAND_RING: Record<StandingsFaceBand, string> = {
  beginner: '[--ring:var(--lv-beg)]',
  intermediate: '[--ring:var(--lv-int)]',
  advanced: '[--ring:var(--lv-adv)]',
  none: '[--ring:var(--lv-none)]',
}
const BAND_OUTLINE =
  '[&>:first-child]:outline-[3px] [&>:first-child]:outline-offset-1 [&>:first-child]:outline-(--ring)'

export type StandingsFacesProps = {
  faces: StandingsFace[]
  /** The face's size in px (the prototype uses 36 on the console and 28 on the session page) */
  size?: 28 | 36
  /**
   * The most faces to draw. A bigger tie draws one fewer and a "+N" chip, so the names keep their
   * width (the standings image uses 4). Leave it out to draw every face.
   */
  limit?: number
  /** The profile button's accessible name; defaults to "View NAME's profile" */
  profileLabel?: (name: string) => string
  className?: string
}

/**
 * The prototype's .lb-stack: a shared standings position shows its players' faces overlapping,
 * the first on top, each separated by a surface-colour edge and, with a band, ringed in its level colour; hovering or focusing a face lifts it. Each
 * face with onOpen is its own profile button. Wraps onto a second line for a big tie.
 */
export function StandingsFaces({
  faces,
  size = 36,
  profileLabel = (name) => `View ${name}'s profile`,
  limit,
  className,
}: StandingsFacesProps) {
  const over = limit !== undefined && faces.length > limit
  const shown = over ? faces.slice(0, Math.max(1, limit - 1)) : faces
  const more = faces.length - shown.length
  return (
    <span
      className={cn(
        'inline-flex flex-none items-center gap-y-1 pl-2.5',
        limit === undefined && 'flex-wrap',
        className,
      )}
    >
      {shown.map((face, index) => {
        const avatar = (
          <Avatar key={face.id} name={face.name} src={face.pictureUrl ?? undefined} size={size} />
        )
        const ring = cn(
          '-ml-2.5 relative rounded-full shadow-[0_0_0_2px_var(--surface)]',
          face.band && [BAND_RING[face.band], BAND_OUTLINE],
        )
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
      {more > 0 ? (
        <span
          aria-hidden
          style={{ width: size, height: size }}
          className="-ml-2.5 relative z-0 inline-grid flex-none place-items-center rounded-full bg-surface font-bold text-[11px] text-fg2 shadow-[0_0_0_2px_var(--surface)]"
        >
          +{more}
        </span>
      ) : null}
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
