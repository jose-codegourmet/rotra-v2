import type { PlayingLevel } from '@rotra/data/player/types'
import { cn } from '@rotra/ui/cn'
import { PlayerFaceButton } from '@rotra/ui/player-face-button'

/** One player drawn on a court side */
export type CourtPlayer = {
  id: string
  name: string
  /** Nickname or first name */
  shortName: string
  level: PlayingLevel | null
  photoUrl?: string
}

export type CourtDrawingProps = {
  /** Two courts stack into one merged area with a single long net (5v5) */
  courts?: 1 | 2
  /** A free court: neutral colours and a "Free" label, no players */
  free?: boolean
  teamA?: CourtPlayer[]
  teamB?: CourtPlayer[]
  /** Opens a player's profile */
  onOpenProfile?: (playerId: string) => void
  className?: string
}

const COURT_W = 134
const COURT_H = 61

/** Prototype listNames(): "Kat", "Kat and Jo", "Kat, Jo and Migs" */
function listNames(names: string[]) {
  return names.length <= 1
    ? names.join('')
    : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

/** Players stack top to bottom; bigger fun teams wrap into a second column (courtSides()). */
const rowsFor = (n: number) => (n <= 2 ? n : n <= 4 ? 2 : 3)
const sizeFor = (n: number): 34 | 28 | 24 => (n <= 1 ? 34 : n <= 3 ? 28 : 24)

/**
 * A badminton court drawn to real proportions (13.4 m × 6.1 m, viewBox 134 × 61) with the net
 * dashed down the middle and each team's pictures on its side. The prototypes' .pitch + courtSVG().
 */
export function CourtDrawing({
  courts = 1,
  free = false,
  teamA = [],
  teamB = [],
  onOpenProfile,
  className,
}: CourtDrawingProps) {
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
        className="m-0 grid min-w-0 grid-flow-col content-center justify-center gap-x-2.5 gap-y-0.5 border-0 p-1.5"
      >
        {players.map((p) => (
          <PlayerFaceButton
            key={p.id}
            name={p.name}
            shortName={p.shortName}
            level={p.level}
            photoUrl={p.photoUrl}
            size={sizeFor(n)}
            compact={n >= 4}
            label={`${p.name}, Team ${team}. View profile`}
            onClick={() => onOpenProfile?.(p.id)}
          />
        ))}
      </fieldset>
    )
  }

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-md',
        courts === 2 ? 'aspect-[134/122]' : 'aspect-[134/61]',
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
          Free
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
