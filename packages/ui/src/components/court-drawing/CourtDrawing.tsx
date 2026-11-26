'use client'

import type { PlayingLevel } from '@rotra/data/player/types'
import { Avatar } from '@rotra/ui/avatar'
import { cn } from '@rotra/ui/cn'
import { PlayerFaceButton } from '@rotra/ui/player-face-button'
import { type MouseEvent, useRef } from 'react'
import { useCourtDrag } from './CourtDrawing.drag'
import {
  courtFaceClass,
  courtFaceFrameClass,
  courtFaceRingClass,
  courtGameBadgeClass,
} from './CourtDrawing.sizes'

/** One player drawn on a court side */
export type CourtPlayer = {
  id: string
  name: string
  /** Nickname or first name */
  shortName: string
  level: PlayingLevel | null
  photoUrl?: string
  /** Completed games this session (the same count as “G/MIN games”) */
  games?: number
}

export type CourtDrawingProps = {
  /** Two courts stack into one merged area with a single long net (5v5) */
  courts?: 1 | 2
  /** Stretch one court vertically for larger lineups without adding a second court. */
  tall?: boolean
  /** A free court: neutral colours and a "Free" label, no players */
  free?: boolean
  freeLabel?: string
  teamA?: CourtPlayer[]
  teamB?: CourtPlayer[]
  /** Session minimum games; used in each picture's accessible name with `games` */
  minimumGames?: number
  /** Show abbreviated playing levels below names. */
  showLevels?: boolean
  /** Opens a player's profile */
  onOpenProfile?: (playerId: string) => void
  /**
   * Opens a player's games this session (D-SESSION-GAMES): the games badge (needs `games`) becomes its
   * own button beside the face button, “NAME's games this session, N”, tooltip “… · tap to see them”.
   * Without it the badge is display only.
   */
  onOpenGames?: (playerId: string) => void
  /** Faces are named “NAME. View profile” (the public session page) instead of with their team */
  plainProfileLabel?: boolean
  /**
   * Getting ready and Playing courts: tapping the drawing anywhere but a face opens the match. It
   * shows a grab cursor, brightens a little on hover and carries the tooltip "Open match". The
   * Open match button stays for keyboards and screen readers.
   */
  onOpenMatch?: () => void
  /**
   * Makes the drawing draggable (mouse after 6 px, touch after press and hold). Dropping on a free
   * court that carries `dropCourtId` (CourtCard) calls this with that court's id; anywhere else does
   * nothing. A tap without dragging still opens the match.
   */
  onDragMove?: (courtId: string) => void
  className?: string
}

const COURT_W = 134
const COURT_H = 61

/** Prototype listNames(): "Mikee", "Mikee and Dexter", "Mikee, Dexter and Jose" */
function listNames(names: string[]) {
  return names.length <= 1
    ? names.join('')
    : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

/** Players stack top to bottom; bigger fun teams wrap into a second column (courtSides()). */
const rowsFor = (n: number) => (n <= 2 ? n : n <= 4 ? 2 : 3)
const sizeFor = (n: number): 34 | 28 | 24 => (n <= 1 ? 34 : n <= 3 ? 28 : 24)

function profileLabel(player: CourtPlayer, team: 'A' | 'B', minimumGames: number | undefined) {
  if (player.games === undefined) return `${player.name}, Team ${team}. View profile`
  const games =
    minimumGames === undefined
      ? `${player.games} games played`
      : `${player.games} of ${minimumGames} games`
  return `${player.name}, Team ${team}, ${games}. View profile`
}

/**
 * A badminton court drawn to real proportions (13.4 m × 6.1 m, viewBox 134 × 61) with the net
 * dashed down the middle and each team's pictures on its side. The prototypes' .pitch + courtSVG().
 */
export function CourtDrawing({
  courts = 1,
  tall = false,
  free = false,
  freeLabel = 'Free',
  teamA = [],
  teamB = [],
  minimumGames,
  showLevels = false,
  onOpenProfile,
  onOpenGames,
  plainProfileLabel = false,
  onOpenMatch,
  onDragMove,
  className,
}: CourtDrawingProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const { onPointerDown } = useCourtDrag(rootRef, free ? undefined : onDragMove)
  // A tap on a face opens the profile; only the rest of the drawing opens the match.
  const onRootClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target instanceof Element && e.target.closest('button')) return
    onOpenMatch?.()
  }
  const height = COURT_H * courts
  const label = free
    ? undefined
    : `Team A ${listNames(teamA.map((p) => p.shortName))} versus Team B ${listNames(teamB.map((p) => p.shortName))}`

  const side = (players: CourtPlayer[], team: 'A' | 'B') => {
    const n = Math.min(players.length, 5)
    return (
      <fieldset
        aria-label={`Team ${team}`}
        style={{ gridTemplateRows: `repeat(${rowsFor(players.length)}, auto)` }}
        className="m-0 grid min-w-0 grid-flow-col content-center justify-center gap-x-2.5 gap-y-0.5 border-0 px-1.5 py-1"
      >
        {players.map((p) => (
          <div key={p.id} className="group/slot relative flex min-w-0 flex-col items-center">
            {onOpenProfile ? (
              <PlayerFaceButton
                name={p.name}
                shortName={p.shortName}
                level={p.level}
                photoUrl={p.photoUrl}
                size={sizeFor(n)}
                compact={n >= 4}
                label={
                  plainProfileLabel
                    ? `${p.name}. View profile`
                    : profileLabel(p, team, minimumGames)
                }
                onClick={() => onOpenProfile(p.id)}
                className={cn(courtFaceClass(n), courtFaceRingClass(p.level))}
              />
            ) : (
              <div
                role="img"
                aria-label={`${p.name}${p.games === undefined ? '' : `, ${p.games} games played`}`}
                className={cn('flex min-w-0 flex-col items-center gap-px', courtFaceClass(n))}
              >
                <Avatar
                  name={p.name}
                  src={p.photoUrl}
                  size={sizeFor(n) === 34 ? 36 : (sizeFor(n) as 24 | 28)}
                  className={cn(
                    'ring-2 ring-on-photo/90',
                    p.level && 'ring-3',
                    p.level?.startsWith('beginner') && 'ring-lv-beg',
                    p.level?.startsWith('intermediate') && 'ring-lv-int',
                    p.level?.startsWith('advanced') && 'ring-lv-adv',
                  )}
                />
                <span className="max-w-16 truncate rounded-full bg-photo-label px-[5px] text-[10px] leading-[1.3] font-bold text-on-photo">
                  {p.shortName}
                </span>
              </div>
            )}
            {showLevels ? (
              <span
                className={cn(
                  'whitespace-nowrap rounded-full bg-court-level-label px-1.5 text-[10px] leading-[1.2] font-bold text-on-photo',
                  p.level?.startsWith('beginner') && 'text-court-level-beg',
                  p.level?.startsWith('intermediate') && 'text-court-level-int',
                  p.level?.startsWith('advanced') && 'text-court-level-adv',
                )}
              >
                {p.level
                  ? p.level
                      .replace('beginner', 'Beg')
                      .replace('intermediate', 'Int')
                      .replace('advanced', 'Adv')
                      .replace('_', ' ')
                      .replace(/ (\w)/, (_, c: string) => ` ${c.toUpperCase()}`)
                  : 'No level'}
              </span>
            ) : null}
            {p.games !== undefined ? (
              <span
                aria-hidden={onOpenGames ? undefined : true}
                className={cn(
                  'pointer-events-none absolute top-0 left-1/2 -translate-x-1/2',
                  courtFaceFrameClass(n),
                )}
              >
                {onOpenGames ? (
                  <button
                    type="button"
                    aria-label={`${p.name}'s games this session, ${p.games}`}
                    title={`${p.name}'s games this session · tap to see them`}
                    onClick={(e) => {
                      e.stopPropagation()
                      onOpenGames(p.id)
                    }}
                    onKeyDown={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                    className={cn(
                      courtGameBadgeClass(n),
                      'pointer-events-auto cursor-pointer before:absolute before:-inset-1.5 before:content-[""]',
                      'hover:!bg-accent hover:!text-on-accent focus-visible:!bg-accent focus-visible:!text-on-accent focus-visible:ring-2 focus-visible:ring-surface',
                    )}
                  >
                    {p.games}
                  </button>
                ) : (
                  <span className={courtGameBadgeClass(n)}>{p.games}</span>
                )}
              </span>
            ) : null}
          </div>
        ))}
      </fieldset>
    )
  }

  const interactive = !free && (!!onOpenMatch || !!onDragMove)
  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: a mouse and touch shortcut; the Open match button is the keyboard and screen-reader path
    <div
      ref={rootRef}
      title={interactive && onOpenMatch ? 'Open match' : undefined}
      onClick={interactive && onOpenMatch ? onRootClick : undefined}
      onPointerDown={interactive ? onPointerDown : undefined}
      className={cn(
        '@container relative overflow-hidden rounded-md',
        interactive &&
          'select-none transition-[filter] duration-150 [-webkit-touch-callout:none] hover:brightness-[1.08]',
        interactive && (onDragMove ? 'cursor-grab' : 'cursor-pointer'),
        courts === 2 || tall ? 'aspect-[134/122]' : 'aspect-[134/61]',
        free
          ? '[--court-c:var(--color-court-free)] [--court-l:var(--color-court-free-line)]'
          : '[--court-c:var(--color-court)] [--court-l:var(--color-court-line)]',
        className,
      )}
    >
      <svg
        viewBox={`0 0 ${COURT_W} ${height}`}
        preserveAspectRatio="none"
        role={label ? 'img' : undefined}
        aria-label={label}
        aria-hidden={label ? undefined : true}
        className="absolute inset-0 block size-full"
      >
        {Array.from({ length: courts }, (_, i) => (
          <g key={`court-${i * COURT_H}`} transform={`translate(0 ${i * COURT_H})`}>
            <rect width={COURT_W} height={COURT_H} fill="var(--court-c)" />
            <g
              fill="none"
              stroke="var(--court-l)"
              strokeWidth={1.5}
              vectorEffect="non-scaling-stroke"
            >
              <rect
                x={0.75}
                y={0.75}
                width={132.5}
                height={59.5}
                vectorEffect="non-scaling-stroke"
              />
              <path
                d="M0 4.6H134M0 56.4H134M7.6 0V61M126.4 0V61M47.2 0V61M86.8 0V61M0 30.5H47.2M86.8 30.5H134"
                vectorEffect="non-scaling-stroke"
              />
            </g>
          </g>
        ))}
        <path
          d={`M67 0V${height}`}
          stroke="var(--court-l)"
          strokeWidth={3}
          strokeDasharray="4 3"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {free ? (
        <span className="absolute inset-0 grid place-items-center text-xs font-extrabold tracking-[2px] text-fg2 uppercase">
          {freeLabel}
        </span>
      ) : (
        <div className="absolute inset-0 grid grid-cols-2">
          {side(teamA, 'A')}
          {side(teamB, 'B')}
        </div>
      )}
    </div>
  )
}
