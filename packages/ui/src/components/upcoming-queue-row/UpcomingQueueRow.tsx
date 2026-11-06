'use client'

import { Card } from '@rotra/ui/card'
import { cn } from '@rotra/ui/cn'
import { MatchCard, type MatchCardProps } from '@rotra/ui/match-card'
import { useLayoutEffect, useState } from 'react'

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

// The prototype's queueCols(): queue tiles are at least 220 px wide with 10 px gaps (gap-2.5).
const TILE_MIN = 220
const GAP = 10
/** Auto Queue drafts carry chips under each name, so a doubles team needs a wider tile to stay on one row. */
export const DRAFT_TILE_MIN = 230

/** How many queue tiles fit across a grid this wide; no upper limit. */
export function queueColumnsFor(width: number, tileMin = TILE_MIN) {
  return Math.max(1, Math.floor((width + GAP) / (tileMin + GAP)))
}

/**
 * The column count from the grid's own width (the page beside the rail), so wider screens show more
 * tiles. Attach the returned ref to the grid. One column before it is measured.
 */
export function useQueueColumns<T extends HTMLElement>(tileMin = TILE_MIN) {
  const [el, setEl] = useState<T | null>(null)
  const [columns, setColumns] = useState(1)
  useLayoutEffect(() => {
    if (!el) return
    const measure = () => setColumns(queueColumnsFor(el.clientWidth, tileMin))
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [el, tileMin])
  return [setEl, columns] as const
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
  const [gridRef, measured] = useQueueColumns<HTMLDivElement>()
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
        ref={gridRef}
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
