'use client'

import { cn } from '@rotra/ui/cn'
import { Icon } from '@rotra/ui/icon'
import { IconButton } from '@rotra/ui/icon-button'
import { MatchCard, type MatchCardFlow, type MatchCardProps } from '@rotra/ui/match-card'
import { SwapSidesArea, type SwapSlot } from '@rotra/ui/swap-sides-area'
import { QUEUE_TILE_MIN, useQueueColumns } from '@rotra/ui/upcoming-queue-row'
import {
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import {
  type QueueViewMode,
  QueueViewSwitch,
  useQueueViewMode,
} from './queue-view-switch/QueueViewSwitch'

/** A waiting match as the grid draws it; the grid supplies position, flow arrow and the handle. */
export type QueueGridMatch = Omit<
  MatchCardProps,
  'position' | 'flow' | 'handleProps' | 'swappable' | 'className'
> & { id: string }

export type QueueGridProps = {
  /** The waiting queue in queue order */
  matches: QueueGridMatch[]
  /** A card was dropped on, or arrow-keyed to, another place: move it to that index */
  onMove: (matchId: string, toIndex: number) => void
  /** Given, players on each card can switch sides; the swap is reported, not applied */
  onSwapSides?: (matchId: string, from: SwapSlot, to: SwapSlot) => void
  /**
   * Slide (default): one row in queue order that scrolls sideways and snaps per card, 450 px cards
   * (86% of the width on phones). Grid: the snake grid, tiles of 450 px or more. Given, the parent
   * owns the view; left out, it is kept per device in localStorage.
   */
  mode?: QueueViewMode
  /** The view switch was used */
  onModeChange?: (mode: QueueViewMode) => void
  /** Grid mode: fixes the column count instead of reading it from the window width (stories, tests) */
  columns?: number
  searchText?: string
  className?: string
}

const QUEUE_HELP_TAIL =
  'Drag a card by ⠿ to reorder (arrow keys work on the handle too). Drag a player onto someone on the other team to switch sides. Any card marked ready can start now, whatever its place.'

export const QUEUE_GRID_HELP = `Order runs in a snake: left to right, then back right to left on the next row. ${QUEUE_HELP_TAIL}`

export const QUEUE_SLIDE_HELP = `Order runs left to right. Swipe or scroll sideways, or use the arrows, to see more. Switch to grid mode to see them all. ${QUEUE_HELP_TAIL}`

/** Gap between cards (gap-2.5) */
const GAP = 10
/** Width of the gradient fade at a scroller edge that still has cards beyond it */
const FADE = 56

/** The edge fade: a gradient mask on a side only while more cards sit that way (none at the ends or with one card). */
export function slideMask(left: boolean, right: boolean): CSSProperties {
  if (!left && !right) return {}
  const gradient =
    left && right
      ? `linear-gradient(to right, transparent, black ${FADE}px, black calc(100% - ${FADE}px), transparent)`
      : left
        ? `linear-gradient(to right, transparent, black ${FADE}px)`
        : `linear-gradient(to right, black calc(100% - ${FADE}px), transparent)`
  return { maskImage: gradient, WebkitMaskImage: gradient }
}

/** Where the i-th card sits and which arrow follows it (the prototype's queueCard()) */
export function snakePlacement(i: number, count: number, cols: number) {
  const row = Math.floor(i / cols),
    k = i % cols,
    col = row % 2 === 0 ? k : cols - 1 - k
  const flow: MatchCardFlow | null =
    i === count - 1 ? null : k === cols - 1 ? 'down' : row % 2 === 0 ? 'right' : 'left'
  return { row, col, flow }
}

/** Match a player's full name or displayed nickname without changing the queue. */
export function matchHasPlayer(match: Pick<QueueGridMatch, 'teamA' | 'teamB'>, text: string) {
  const query = text.trim().toLocaleLowerCase()
  return (
    query !== '' &&
    [...match.teamA, ...match.teamB].some((p) =>
      `${p.name} ${p.shortName}`.toLocaleLowerCase().includes(query),
    )
  )
}

type Drag = { id: string; x: number; y: number; dx: number; dy: number; targetId: string | null }

/**
 * The Main Queue (Q-QUEUE): a bar with "N waiting", previous / next arrows (slide only) and the view
 * switch, then the waiting MatchCards in slide mode (one row, native scroll snap, edge fade) or grid
 * mode (the snake grid with flow arrows). Drag a card by its ⠿ handle (mouse or touch) onto another
 * card to take its place, or press arrows on the focused handle to move one place; focus stays on
 * the handle. The scroll position survives updates.
 */
export function QueueGrid({
  matches,
  onMove,
  onSwapSides,
  mode: modeProp,
  onModeChange,
  columns,
  searchText = '',
  className,
}: QueueGridProps) {
  const [savedMode, saveMode] = useQueueViewMode()
  const mode = modeProp ?? savedMode
  const slide = mode === 'slide'
  const changeMode = (next: QueueViewMode) => {
    saveMode(next)
    onModeChange?.(next)
  }
  const [gridRef, measured] = useQueueColumns<HTMLDivElement>(QUEUE_TILE_MIN)
  const cols = Math.max(1, columns ?? measured)
  const [drag, setDrag] = useState<Drag | null>(null)
  const dragRef = useRef<Drag | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const scrollerRef = useRef<HTMLDivElement>(null)
  const scrollLeftRef = useRef(0)
  const [edge, setEdge] = useState({ left: false, right: false })
  const query = searchText.trim().toLocaleLowerCase()
  const count = matches.length

  const measureEdge = () => {
    const el = scrollerRef.current
    if (!el) return
    const left = el.scrollLeft > 4,
      right = el.scrollLeft < el.scrollWidth - el.clientWidth - 4
    setEdge((prev) => (prev.left === left && prev.right === right ? prev : { left, right }))
  }

  // Slide mode: put the scroller back where it was (it remounts when the view changes), then follow
  // its size and its cards so the fade stays right.
  // biome-ignore lint/correctness/useExhaustiveDependencies: measureEdge only reads refs and a state setter
  useLayoutEffect(() => {
    const el = scrollerRef.current
    if (!slide || !el) return
    el.style.scrollBehavior = 'auto'
    el.scrollLeft = scrollLeftRef.current
    el.style.scrollBehavior = ''
    measureEdge()
    const observer = new ResizeObserver(measureEdge)
    observer.observe(el)
    return () => observer.disconnect()
  }, [slide, count])

  useEffect(() => {
    if (query)
      rootRef.current?.querySelector<HTMLElement>('[data-search-hit="true"]')?.scrollIntoView({
        block: 'nearest',
        inline: 'nearest',
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 'instant'
          : 'smooth',
      })
  }, [query])

  const step = (direction: 1 | -1) => {
    const el = scrollerRef.current
    if (!el) return
    const card = el.querySelector<HTMLElement>('[data-queue-id]')
    // Smooth through CSS (scroll-smooth, only without reduced motion)
    el.scrollBy({ left: direction * (card ? card.offsetWidth + GAP : 300) })
  }

  const update = (next: Drag | null) => {
    dragRef.current = next
    setDrag(next)
  }

  const handleProps = (id: string, i: number): MatchCardProps['handleProps'] => ({
    onPointerDown: (e: PointerEvent<HTMLButtonElement>) => {
      if (e.button !== 0 || dragRef.current) return
      e.preventDefault()
      try {
        e.currentTarget.setPointerCapture(e.pointerId)
      } catch {
        // capture unsupported
      }
      update({ id, x: e.clientX, y: e.clientY, dx: 0, dy: 0, targetId: null })
    },
    onPointerMove: (e: PointerEvent<HTMLButtonElement>) => {
      const d = dragRef.current
      if (!d || d.id !== id) return
      // Slide mode: nudge the row when the card is held near an edge, so far cards can be reached.
      const scroller = scrollerRef.current
      if (scroller) {
        const box = scroller.getBoundingClientRect()
        if (e.clientX < box.left + 48) scroller.scrollBy({ left: -16, behavior: 'instant' })
        else if (e.clientX > box.right - 48) scroller.scrollBy({ left: 16, behavior: 'instant' })
      }
      const hit = document.elementFromPoint(e.clientX, e.clientY)
      const card = hit instanceof Element ? hit.closest<HTMLElement>('[data-queue-id]') : null
      const targetId = card?.dataset.queueId
      update({
        ...d,
        dx: e.clientX - d.x,
        dy: e.clientY - d.y,
        targetId: targetId && targetId !== id ? targetId : null,
      })
    },
    onPointerUp: () => {
      const d = dragRef.current
      if (!d || d.id !== id) return
      update(null)
      if (!d.targetId) return
      const to = matches.findIndex((m) => m.id === d.targetId)
      if (to >= 0) onMove(id, to)
    },
    onPointerCancel: () => {
      if (dragRef.current?.id === id) update(null)
    },
    onKeyDown: (e: KeyboardEvent<HTMLButtonElement>) => {
      const earlier = e.key === 'ArrowLeft' || e.key === 'ArrowUp',
        later = e.key === 'ArrowRight' || e.key === 'ArrowDown'
      if (!earlier && !later) return
      e.preventDefault()
      const to = earlier ? i - 1 : i + 1
      if (to < 0 || to >= matches.length) return
      onMove(id, to)
    },
  })

  if (matches.length === 0) return null

  const items = matches.map((m, i) => {
    const { row, col, flow } = slide
      ? { row: 0, col: i, flow: (i === count - 1 ? null : 'right') as MatchCardFlow | null }
      : snakePlacement(i, count, cols)
    const dragging = drag?.id === m.id
    const target = drag?.targetId === m.id
    const { id, ...rest } = m
    const hit = query !== '' && matchHasPlayer(m, query)
    const highlightedPlayerIds = hit
      ? [...m.teamA, ...m.teamB]
          .filter((p) => `${p.name} ${p.shortName}`.toLocaleLowerCase().includes(query))
          .map((p) => p.id)
      : []
    const card = (
      <MatchCard
        {...rest}
        searchState={query ? (hit ? 'hit' : 'dim') : undefined}
        highlightedPlayerIds={highlightedPlayerIds}
        position={i + 1}
        flow={flow}
        handleProps={handleProps(id, i)}
        swappable={!!onSwapSides}
      />
    )
    return (
      <div
        key={id}
        data-queue-id={id}
        data-search-hit={hit || undefined}
        style={{
          gridRow: slide ? undefined : row + 1,
          gridColumn: slide ? undefined : col + 1,
          transform: dragging && drag ? `translate(${drag.dx}px, ${drag.dy}px)` : undefined,
        }}
        className={cn(
          'relative min-w-0 rounded-lg',
          slide && 'flex-none basis-[min(450px,86%)] snap-start',
          dragging && 'pointer-events-none z-[5] opacity-[0.92] shadow-pop',
          target && 'outline-2 outline-dashed outline-accent outline-offset-2',
        )}
      >
        {onSwapSides ? (
          <SwapSidesArea onSwap={(from, to) => onSwapSides(id, from, to)}>{card}</SwapSidesArea>
        ) : (
          card
        )}
      </div>
    )
  })

  return (
    <div ref={rootRef} className={cn('flex flex-col gap-3', className)}>
      <p className="text-[13px] text-fg2">{slide ? QUEUE_SLIDE_HELP : QUEUE_GRID_HELP}</p>
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <span className="text-[13px] text-fg2">{count} waiting</span>
        <div className="flex items-center gap-2">
          {slide ? (
            <div className="inline-flex gap-1.5">
              <IconButton
                size="sm"
                label="Previous matches"
                title="Previous"
                disabled={!edge.left}
                onClick={() => step(-1)}
              >
                <Icon name="back" />
              </IconButton>
              <IconButton
                size="sm"
                label="Next matches"
                title="Next"
                disabled={!edge.right}
                onClick={() => step(1)}
              >
                <Icon name="forward" />
              </IconButton>
            </div>
          ) : null}
          <QueueViewSwitch value={mode} onChange={changeMode} />
        </div>
      </div>
      {slide ? (
        <section
          ref={scrollerRef}
          aria-label="Waiting matches, scroll sideways"
          // biome-ignore lint/a11y/noNoninteractiveTabindex: a scrolling region must take focus so the arrow keys scroll it
          tabIndex={0}
          onScroll={(e) => {
            scrollLeftRef.current = e.currentTarget.scrollLeft
            measureEdge()
          }}
          style={slideMask(edge.left, edge.right)}
          className={cn(
            'flex snap-x snap-mandatory gap-2.5 overflow-x-auto overscroll-x-contain scroll-px-2 px-2 pt-1 pb-[22px]',
            'motion-safe:scroll-smooth [scrollbar-width:thin]',
            'rounded-lg focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2',
          )}
        >
          {items}
        </section>
      ) : (
        <div
          ref={gridRef}
          className="grid gap-2.5"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {items}
        </div>
      )}
    </div>
  )
}
