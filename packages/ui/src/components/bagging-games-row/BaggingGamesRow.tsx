'use client'

import type { BaggingGames } from '@rotra/data/match/auto-queue-types'
import { cn } from '@rotra/ui/cn'

export type BaggingGamesRowProps = {
  /** `all`, or the game numbers the pair plays together */
  games: BaggingGames
  /** The session minimum: one button per game from 1 to this number */
  minimumGames: number
  /** The next value after a tap; the caller applies the ALL fallback (toggleBaggingGame) */
  onToggle: (value: 'all' | number) => void
  /** Names the group, e.g. "Games" or "Games for Kat and Bea" */
  'aria-label': string
  disabled?: boolean
  className?: string
}

/**
 * The prototypes' .seg.bag-seg (Add bagging pair sheet and the Bagging pairs card): ALL, then one
 * button per game number up to the session minimum. Several numbers can be on; every number or none
 * means ALL (owner comment, November 11, 2026).
 */
export function BaggingGamesRow({
  games,
  minimumGames,
  onToggle,
  disabled,
  className,
  ...aria
}: BaggingGamesRowProps) {
  const picked = games === 'all' ? [] : games
  const numbers = Array.from({ length: Math.max(1, minimumGames) }, (_, i) => i + 1)
  const item = (value: 'all' | number, pressed: boolean) => (
    <button
      key={value}
      type="button"
      disabled={disabled}
      aria-pressed={pressed}
      aria-label={value === 'all' ? undefined : `Game ${value}`}
      onClick={() => onToggle(value)}
      className={cn(
        'inline-flex min-h-9 min-w-9 items-center justify-center rounded-[7px] border-0 bg-transparent px-3 font-semibold text-fg2 tabular-nums',
        'aria-pressed:bg-elev aria-pressed:text-fg disabled:cursor-not-allowed disabled:opacity-45',
        'touch:min-h-11 touch:px-3.5',
      )}
    >
      {value === 'all' ? 'ALL' : value}
    </button>
  )
  return (
    <fieldset
      disabled={disabled}
      className={cn(
        'm-0 inline-flex flex-wrap gap-[3px] self-start rounded-lg border border-border-strong p-[3px]',
        className,
      )}
    >
      <legend className="sr-only">{aria['aria-label']}</legend>
      {item('all', games === 'all')}
      {numbers.map((n) => item(n, picked.includes(n)))}
    </fieldset>
  )
}
