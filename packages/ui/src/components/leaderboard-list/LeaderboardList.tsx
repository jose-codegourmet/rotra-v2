import { Button } from '@rotra/ui/button'
import { Skeleton } from '@rotra/ui/skeleton'
import type { ReactNode } from 'react'

export type LeaderboardListProps = {
  children?: ReactNode
  loading?: boolean
  shown?: number
  total?: number
  onShowMore?: () => void
}

const LOADING_NAME_WIDTHS = ['w-12', 'w-20', 'w-28', 'w-36'] as const

function LoadingRows() {
  return Array.from({ length: 8 }, (_, index) => (
    <div
      key={index}
      className="grid min-h-14 grid-cols-[56px_36px_minmax(0,1fr)_110px] items-center gap-3 px-3 py-2"
    >
      <Skeleton className="w-7 justify-self-end" />
      <span aria-hidden className="size-9 rounded-full bg-elev" />
      <Skeleton className={LOADING_NAME_WIDTHS[index % LOADING_NAME_WIDTHS.length]} />
      <Skeleton className="max-[560px]:hidden" />
    </div>
  ))
}

/** Frame for the Player Information leaderboard, including its loading rows and load-more footer. */
export function LeaderboardList({
  children,
  loading = false,
  shown,
  total,
  onShowMore,
}: LeaderboardListProps) {
  const canShowMore = shown !== undefined && total !== undefined && shown < total && onShowMore
  return (
    <section
      className="flex flex-col"
      aria-busy={loading || undefined}
      aria-label={loading ? 'Loading the leaderboard' : undefined}
    >
      <div
        aria-hidden
        className="grid grid-cols-[56px_36px_minmax(0,1fr)_auto] items-center gap-3 border-b border-border px-3 py-1.5 text-[11px] font-semibold tracking-[0.6px] text-fg2 uppercase max-[560px]:hidden"
      >
        <span className="text-right">#</span>
        <span />
        <span>Player</span>
        <span className="text-right">Rank</span>
      </div>
      <div>{loading ? <LoadingRows /> : children}</div>
      {shown !== undefined && total !== undefined ? (
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-3 py-3 text-sm text-fg2">
          <span>
            Showing 1–{shown.toLocaleString('en-PH')} of {total.toLocaleString('en-PH')} players
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
