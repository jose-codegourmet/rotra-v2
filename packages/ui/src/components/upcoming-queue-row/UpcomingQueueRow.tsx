'use client'

import { Card } from '@rotra/ui/card'
import { cn } from '@rotra/ui/cn'
import { MatchCard, type MatchCardProps } from '@rotra/ui/match-card'
import { useSyncExternalStore } from 'react'

/** A waiting match as the row shows it; the row supplies the flow arrow. */
export type UpcomingQueueMatch = Omit<MatchCardProps, 'flow' | 'className'>

export type UpcomingQueueRowProps = {
  /** The whole waiting queue in queue order; the row shows the first (columns − 1) */
  matches: UpcomingQueueMatch[]
  /** Waiting matches that need attention */
  attentionCount: number
  /** Opens the Queue tab (the More queues tile) */
  onOpenQueue: () => void
  /** Fixes the column count instead of reading it from the window width (stories, tests) */
  columns?: number
  className?: string
}

// The prototype's queueCols(): the queue grid's column count from the window width.
const COLUMN_QUERIES = [
  { min: 1200, columns: 5 },
  { min: 960, columns: 4 },
  { min: 700, columns: 3 },
  { min: 460, columns: 2 },
] as const

function subscribe(onChange: () => void) {
  const lists = COLUMN_QUERIES.map((q) => window.matchMedia(`(min-width: ${q.min}px)`))
  for (const l of lists) l.addEventListener('change', onChange)
  return () => {
    for (const l of lists) l.removeEventListener('change', onChange)
  }
}

function readColumns() {
  return (
    COLUMN_QUERIES.find((q) => window.matchMedia(`(min-width: ${q.min}px)`).matches)?.columns ?? 1
  )
}

/** 5 columns from 1200 px, 4 from 960, 3 from 700, 2 from 460, else 1. One column before hydration. */
export function useQueueColumns() {
  return useSyncExternalStore(subscribe, readColumns, () => 1)
}

/**
 * The Session view's "Upcoming queued matches": header with the waiting and attention counts, one
 * grid row of the first queue cards, and a More queues tile that opens the Queue tab.
 */
export function UpcomingQueueRow({
  matches,
  attentionCount,
  onOpenQueue,
  columns,
  className,
}: UpcomingQueueRowProps) {
  const measured = useQueueColumns()
  const cols = Math.max(1, columns ?? measured)
  const shown = matches.slice(0, Math.max(1, cols - 1))
  const rest = matches.length - shown.length
  const hint =
    rest > 0
      ? `+${rest} more waiting`
      : matches.length
        ? 'Reorder, add or regenerate'
        : 'Add or generate matches'
  return (
    <section aria-label="Upcoming queued matches" className={cn('flex flex-col gap-3', className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold">Upcoming queued matches</h2>
        <span className="text-[13px] text-fg2">
          {matches.length} waiting
          {attentionCount > 0 ? (
            <>
              {' · '}
              <span className="text-warn">{attentionCount} need attention</span>
            </>
          ) : null}
        </span>
      </div>
      <div
        className="grid gap-2.5"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {shown.length ? (
          shown.map((m, i) => (
            <MatchCard key={m.matchNo} {...m} flow={i === matches.length - 1 ? null : 'right'} />
          ))
        ) : (
          <Card
            padding="none"
            className="px-3 py-6 text-center text-sm text-fg2"
            style={{ gridColumn: `span ${Math.max(1, cols - 1)}` }}
          >
            No matches queued yet.
          </Card>
        )}
        <button
          type="button"
          onClick={onOpenQueue}
          aria-label="More queues: open the Queue tab"
          className={cn(
            'flex min-h-[150px] min-w-0 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg',
            'border border-dashed border-border-strong bg-transparent p-2.5 text-center text-fg',
            'hover:border-accent hover:bg-accent-subtle',
          )}
        >
          <span aria-hidden className="text-[26px] leading-none text-accent">
            →
          </span>
          <b>More queues</b>
          <span className="text-[13px] text-fg2">{hint}</span>
        </button>
      </div>
    </section>
  )
}
