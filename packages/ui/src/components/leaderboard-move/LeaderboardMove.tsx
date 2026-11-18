import { Chip } from '@rotra/ui/chip'
import { cn } from '@rotra/ui/cn'
import {
  LEADERBOARD_PERIOD_COPY,
  type LeaderboardPeriod,
} from '@rotra/ui/leaderboard-period-switch'

export type LeaderboardMoveProps = {
  period: LeaderboardPeriod
  position: number
  /** Null means the player was absent from the previous list. */
  previousPosition: number | null
  /** A selectable row exposes the movement through the row's own focus and name. */
  rowIsTrigger?: boolean
}

export function leaderboardMovement(
  period: LeaderboardPeriod,
  position: number,
  previousPosition: number | null,
) {
  const { previous, list } = LEADERBOARD_PERIOD_COPY[period]
  if (previousPosition === null) {
    return {
      direction: 'new',
      sentence: `New on the ${list} list. Not on it ${previous}.`,
    } as const
  }
  const earlierPlace = previousPosition.toLocaleString('en-PH')
  if (previousPosition === position) {
    return { direction: 'same', sentence: `Same place as ${previous}: #${earlierPlace}.` } as const
  }
  const up = previousPosition > position
  const places = Math.abs(previousPosition - position)
  return {
    direction: up ? 'up' : 'down',
    places,
    sentence: `${up ? 'Up' : 'Down'} ${places} ${places === 1 ? 'place' : 'places'}. Was #${earlierPlace} ${previous}.`,
  } as const
}

export function LeaderboardMove({
  period,
  position,
  previousPosition,
  rowIsTrigger = false,
}: LeaderboardMoveProps) {
  const movement = leaderboardMovement(period, position, previousPosition)
  const moving = movement.direction === 'up' || movement.direction === 'down'
  return (
    <span
      className={cn(
        'group/leaderboard-move relative inline-flex h-6 min-w-[30px] items-center justify-center gap-0.5 font-mono text-[11px] font-bold text-fg2 max-[560px]:row-span-2',
        !rowIsTrigger &&
          'focus-visible:rounded-md focus-visible:outline-2 focus-visible:outline-accent',
        movement.direction === 'up' && 'text-accent',
        movement.direction === 'down' && 'text-error',
      )}
      role={rowIsTrigger ? undefined : 'img'}
      // biome-ignore lint/a11y/noNoninteractiveTabindex: Makes the tooltip available to keyboard users without a row button.
      tabIndex={rowIsTrigger ? undefined : 0}
      aria-label={rowIsTrigger ? undefined : movement.sentence}
      aria-hidden={rowIsTrigger || undefined}
    >
      <span aria-hidden className="inline-flex items-center gap-0.5">
        {moving ? (
          <>
            {/* biome-ignore lint/a11y/noSvgWithoutTitle: The trigger already announces the movement. */}
            <svg className="size-2.5 flex-none" viewBox="0 0 10 10" aria-hidden>
              <path
                fill="currentColor"
                d={movement.direction === 'up' ? 'M5 1 9.5 8.5H.5z' : 'M5 9 .5 1.5h9z'}
              />
            </svg>
            {movement.places}
          </>
        ) : movement.direction === 'new' ? (
          <Chip
            tone="warn"
            className="h-5 px-1.5 py-0 font-sans text-[10px] font-bold tracking-[0.4px] uppercase"
          >
            New
          </Chip>
        ) : (
          '–'
        )}
      </span>
      <span
        aria-hidden
        className="pointer-events-none absolute bottom-[calc(100%_+_6px)] left-1/2 z-10 w-max max-w-[240px] -translate-x-[30%] rounded-md bg-fg px-2.5 py-1.5 font-sans text-xs leading-[1.35] font-semibold text-bg opacity-0 transition-opacity duration-120 group-hover/leaderboard-move:opacity-100 group-focus-visible/leaderboard-move:opacity-100 group-hover/leaderboard-row:opacity-100 group-focus-visible/leaderboard-row:opacity-100 max-[560px]:-translate-x-[12%] motion-reduce:transition-none"
      >
        {movement.sentence}
      </span>
    </span>
  )
}
