'use client'

import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
import { cn } from '@rotra/ui/cn'
import { Icon } from '@rotra/ui/icon'
import type { ReactNode } from 'react'

/** Counted wins and losses on one weekday */
export type WeeklyPerformanceDay = { wins: number; losses: number }
/** A tapped bar: that weekday's wins or losses (0 = Sunday) */
export type WeeklyPerformanceFilter = { day: number; result: 'won' | 'lost' }

export type WeeklyPerformanceChartProps = {
  /** Seven days, Sunday first: counted singles and doubles this calendar year */
  days: WeeklyPerformanceDay[]
  /** The current calendar year, in the title (“2026 Weekly Performance”) */
  year: number
  /**
   * The profile's copy: the bars are not buttons, the legend reads “Singles and doubles this year”,
   * and See all games shows when `onSeeAllGames` is given.
   */
  readOnly?: boolean
  /** The chosen bar (Games page); the other bars dim and “Showing DAY wins” shows with Clear */
  filter?: WeeklyPerformanceFilter | null
  /** Tapping a bar picks it; tapping it again, or Clear, passes null */
  onFilterChange?: (filter: WeeklyPerformanceFilter | null) => void
  /** Read-only: the See all games button */
  onSeeAllGames?: () => void
  /** Own profile: the visibility chip beside the title (Public, Signed-in players, Only you) */
  visibility?: ReactNode
  className?: string
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/** Highest win rate with at least 3 games; -1 when no weekday qualifies. */
function bestDay(days: WeeklyPerformanceDay[]) {
  let best = -1
  days.forEach((d, i) => {
    const n = d.wins + d.losses
    if (n < 3) return
    const b = days[best]
    if (best < 0 || !b || d.wins / n > b.wins / (b.wins + b.losses)) best = i
  })
  return best
}

/**
 * P-MATCH-HISTORY and the profile's Weekly performance (2026-11-13 log; the prototype's weeklyPerf):
 * four summary tiles, then per weekday a win-rate pill over two side-by-side bars (wins in the
 * accent, losses in the error colour; heights relative to the largest single count) and the short
 * day name. The best day (highest win rate, 3+ games) is lifted on an accent column. On the Games
 * page each bar is a button that filters the games below. Hidden when there are no counted games.
 */
export function WeeklyPerformanceChart({
  days,
  year,
  readOnly = false,
  filter,
  onFilterChange,
  onSeeAllGames,
  visibility,
  className,
}: WeeklyPerformanceChartProps) {
  const wins = days.reduce((n, d) => n + d.wins, 0)
  const losses = days.reduce((n, d) => n + d.losses, 0)
  const total = wins + losses
  if (!total) return null
  const rate = Math.round((wins / total) * 100)
  const best = bestDay(days)
  const max = Math.max(1, ...days.map((d) => Math.max(d.wins, d.losses)))
  const chosen = readOnly ? null : (filter ?? null)

  const bar = (day: number, result: 'won' | 'lost', value: number) => {
    const height = `${Math.max(Math.round((value / max) * 100), value ? 6 : 2)}%`
    const tone = result === 'won' ? 'bg-accent' : 'bg-error'
    const count = (
      <span
        className={cn(
          'absolute bottom-[calc(100%+2px)] left-1/2 -translate-x-1/2 text-[11px] font-extrabold tabular-nums max-[480px]:text-[9px]',
          result === 'won' ? 'text-accent' : 'text-error',
          !value && 'hidden',
        )}
      >
        {value || ''}
      </span>
    )
    const shape = cn(
      'relative w-[44%] max-w-7 rounded-t-[5px] border-0 p-0 transition-[opacity,filter] duration-[120ms]',
      tone,
    )
    if (readOnly)
      return (
        <span aria-hidden="true" className={cn(shape, !value && 'opacity-35')} style={{ height }}>
          {count}
        </span>
      )
    const on = !!chosen && chosen.day === day && chosen.result === result
    const word =
      result === 'won' ? (value === 1 ? 'win' : 'wins') : value === 1 ? 'loss' : 'losses'
    return (
      <button
        type="button"
        aria-pressed={on}
        aria-label={`${DAYS[day]}: ${value} ${word}. Show ${result === 'won' ? 'these wins' : 'these losses'}`}
        disabled={!value}
        onClick={() => onFilterChange?.(on ? null : { day, result })}
        style={{ height }}
        className={cn(
          shape,
          'cursor-pointer hover:enabled:brightness-115 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg disabled:cursor-default disabled:opacity-35',
          chosen && !on && 'opacity-30',
          on && 'shadow-[0_0_0_2px_var(--color-surface),0_0_0_4px_var(--color-fg)]',
        )}
      >
        {count}
      </button>
    )
  }

  const tile = 'flex min-w-0 flex-col gap-0.5 rounded-md bg-elev px-3 py-2.5'
  const label = 'text-[11px] font-semibold tracking-[0.5px] text-fg2 uppercase'
  return (
    <Card className={cn('flex flex-col gap-4', className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-extrabold">{year} Weekly Performance</h2>
        {visibility ? <div className="flex items-center gap-1.5">{visibility}</div> : null}
      </div>
      <div className="grid grid-cols-4 gap-2 max-[480px]:grid-cols-2">
        <div className={tile}>
          <span className={label}>Games</span>
          <b className="text-lg font-extrabold tabular-nums">{total}</b>
        </div>
        <div className={tile}>
          <span className={label}>Record</span>
          <b className="truncate text-lg font-extrabold tabular-nums">
            <span className="text-accent">{wins}W</span> <span className="text-error">{losses}L</span>
          </b>
        </div>
        <div className={tile}>
          <span className={label}>Win rate</span>
          <b className="text-lg font-extrabold tabular-nums">{rate}%</b>
        </div>
        <div
          className={cn(
            tile,
            best >= 0 && 'bg-accent-subtle shadow-[inset_0_0_0_1px] shadow-accent/45',
          )}
        >
          <span className={label}>Best day</span>
          <b className={cn('truncate text-lg font-extrabold', best >= 0 && 'text-accent')}>
            {best >= 0 ? DAYS[best] : '—'}
          </b>
        </div>
      </div>
      <div
        role="list"
        aria-label="Wins and losses by day of the week"
        className="relative grid grid-cols-7 gap-1.5 pt-1 max-[480px]:gap-0.5"
      >
        {days.map((d, i) => {
          const n = d.wins + d.losses
          const dayRate = n ? Math.round((d.wins / n) * 100) : null
          const isBest = i === best
          return (
            <div
              key={DAYS[i]}
              role="listitem"
              aria-label={`${DAYS[i]}: ${n ? `${d.wins} won, ${d.losses} lost, ${dayRate}% win rate` : 'no games'}`}
              className={cn(
                'flex min-w-0 flex-col items-center gap-1.5 rounded-[10px] px-0.5 pt-1.5 pb-2',
                isBest && 'bg-linear-to-b from-transparent to-accent-subtle',
              )}
            >
              <span
                className={cn(
                  'rounded-full px-1.5 py-px text-[11px] font-extrabold whitespace-nowrap tabular-nums max-[480px]:px-1 max-[480px]:py-0 max-[480px]:text-[9px]',
                  !n ? 'text-fg3' : isBest ? 'bg-accent text-on-accent' : 'bg-elev text-fg',
                )}
              >
                {n ? `${dayRate}%` : '—'}
              </span>
              <div
                className={cn(
                  'flex h-[166px] w-full items-end justify-center gap-[3px] border-b border-border-strong pt-4 max-[480px]:h-[136px] max-[480px]:gap-0.5',
                  readOnly && 'h-[136px]',
                )}
              >
                {bar(i, 'won', d.wins)}
                {bar(i, 'lost', d.losses)}
              </div>
              <b
                className={cn(
                  'text-xs font-extrabold tracking-[0.6px] uppercase max-[480px]:text-[10px]',
                  isBest ? 'text-accent' : 'text-fg2',
                )}
              >
                {DAYS[i]?.slice(0, 3)}
              </b>
            </div>
          )
        })}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-fg2">
        <span>
          <i className="mr-1.5 inline-block size-2.5 rounded-[3px] bg-accent align-[-1px]" />
          Won
        </span>
        <span>
          <i className="mr-1.5 inline-block size-2.5 rounded-[3px] bg-error align-[-1px]" />
          Lost
        </span>
        <span>
          {readOnly
            ? 'Singles and doubles this year'
            : 'Tap a bar to see those games · counted games this year'}
        </span>
      </div>
      {readOnly && onSeeAllGames ? (
        <Button size="sm" className="self-start" onClick={onSeeAllGames}>
          See all games <Icon name="forward" />
        </Button>
      ) : null}
      {chosen ? (
        <div
          role="status"
          className="flex flex-wrap items-center gap-2 rounded-md bg-elev px-3 py-2 text-sm"
        >
          Showing{' '}
          <b>
            {DAYS[chosen.day]} {chosen.result === 'won' ? 'wins' : 'losses'}
          </b>
          <Button size="xs" onClick={() => onFilterChange?.(null)}>
            Clear
          </Button>
        </div>
      ) : null}
    </Card>
  )
}
