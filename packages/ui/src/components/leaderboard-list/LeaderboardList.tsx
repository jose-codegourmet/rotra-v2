import { Button } from '@rotra/ui/button'
import { cn } from '@rotra/ui/cn'
import type { LeaderboardPeriod } from '@rotra/ui/leaderboard-period-switch'
import { Skeleton } from '@rotra/ui/skeleton'
import type { ReactNode } from 'react'

export type LeaderboardListProps = {
  children?: ReactNode
  period?: LeaderboardPeriod
  loading?: boolean
  /** Refresh existing rows without replacing them with placeholders. */
  busy?: boolean
  shown?: number
  total?: number
  search?: { query: string; total: number }
  onShowMore?: () => void
}

const LOADING_NAME_WIDTHS = ['w-12', 'w-20', 'w-28', 'w-36'] as const

function LoadingRows({ period }: Pick<LeaderboardListProps, 'period'>) {
  return Array.from({ length: 8 }, (_, index) => (
    <div
      key={index}
      className={cn(
        'grid min-h-14 grid-cols-[56px_36px_minmax(0,1fr)_110px] items-center gap-3 px-3 py-2',
        period &&
          'grid-cols-[56px_30px_36px_minmax(0,1fr)_110px] max-[560px]:grid-cols-[34px_30px_36px_minmax(0,1fr)] max-[560px]:gap-x-2 max-[560px]:px-2',
      )}
    >
      <Skeleton className="w-7 justify-self-end" />
      {period ? <span aria-hidden /> : null}
      <span aria-hidden className="size-9 rounded-full bg-elev" />
      <Skeleton className={LOADING_NAME_WIDTHS[index % LOADING_NAME_WIDTHS.length]} />
      <Skeleton className="max-[560px]:hidden" />
    </div>
  ))
}

/** Frame for the Player Information leaderboard, including its loading rows and load-more footer. */
export function LeaderboardList({
  children,
  period,
  loading = false,
  busy = false,
  shown,
  total,
  search,
  onShowMore,
}: LeaderboardListProps) {
  const canShowMore = shown !== undefined && total !== undefined && shown < total && onShowMore
  return (
    <section
      className="flex flex-col"
      aria-busy={loading || busy || undefined}
      aria-label={loading ? 'Loading the leaderboard' : undefined}
    >
      {search ? (
        <p className="mb-4 text-[13px] text-fg2" aria-live="polite">
          {search.total} {search.total === 1 ? 'player matches' : 'players match'} “{search.query}”.
        </p>
      ) : null}
      {loading && period ? null : (
        <div
          aria-hidden
          className={cn(
            'grid grid-cols-[56px_36px_minmax(0,1fr)_auto] items-center gap-3 border-b border-border px-3 py-1.5 text-[11px] font-semibold tracking-[0.6px] text-fg2 uppercase max-[560px]:hidden',
            period && 'grid-cols-[56px_30px_36px_minmax(0,1fr)_auto]',
          )}
        >
          <span className="text-right">#</span>
          <span />
          {period ? <span /> : null}
          <span>Player</span>
          <span className="text-right">{period ? 'Wins' : 'Rank'}</span>
        </div>
      )}
      <div>{loading ? <LoadingRows period={period} /> : children}</div>
      {shown !== undefined && total !== undefined ? (
        <footer
          className={cn(
            'flex flex-wrap items-center justify-between gap-3 text-fg2',
            period ? 'mt-4 text-[13px]' : 'border-t border-border px-3 py-3 text-sm',
          )}
        >
          <span>
            Showing 1–{shown.toLocaleString('en-PH')} of{' '}
            {period
              ? `the top ${total.toLocaleString('en-PH')}`
              : `${total.toLocaleString('en-PH')} players`}
          </span>
          {canShowMore ? (
            <Button size="sm" onClick={onShowMore}>
              Show 25 more
            </Button>
          ) : null}
        </footer>
      ) : null}
    </section>
  )
}
