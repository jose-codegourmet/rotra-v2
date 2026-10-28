'use client'

import { cn } from '@rotra/ui/cn'
import { MatchCard, type MatchCardFlow, type MatchCardProps } from '@rotra/ui/match-card'
import { SwapSidesArea, type SwapSlot } from '@rotra/ui/swap-sides-area'
import { useQueueColumns } from '@rotra/ui/upcoming-queue-row'
import { type KeyboardEvent, type PointerEvent, useRef, useState } from 'react'

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
  /** Fixes the column count instead of reading it from the window width (stories, tests) */
  columns?: number
  className?: string
}

export const QUEUE_GRID_HELP =
  'Order runs in a snake: left to right, then back right to left on the next row. Drag a card by ⠿ to reorder (arrow keys work on the handle too). Drag a player onto someone on the other team to switch sides. Any card marked ready can start now, whatever its place.'

/** Where the i-th card sits and which arrow follows it (the prototype's queueCard()) */
export function snakePlacement(i: number, count: number, cols: number) {
  const row = Math.floor(i / cols),
    k = i % cols,
    col = row % 2 === 0 ? k : cols - 1 - k
  const flow: MatchCardFlow | null =
    i === count - 1 ? null : k === cols - 1 ? 'down' : row % 2 === 0 ? 'right' : 'left'
  return { row, col, flow }
}

type Drag = { id: string; x: number; y: number; dx: number; dy: number; targetId: string | null }

/**
 * The Queue tab's grid (.qgrid): MatchCards in 1–5 columns by width, ordered in a snake with flow
 * arrows. Drag a card by its ⠿ handle (mouse or touch) onto another card to take its place, or
 * press ← / ↑ and → / ↓ on the focused handle to move one place; focus stays on the handle.
 */
export function QueueGrid({ matches, onMove, onSwapSides, columns, className }: QueueGridProps) {
  const measured = useQueueColumns()
  const cols = Math.max(1, columns ?? measured)
  const [drag, setDrag] = useState<Drag | null>(null)
  const dragRef = useRef<Drag | null>(null)

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

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <p className="text-[13px] text-fg2">{QUEUE_GRID_HELP}</p>
      <div
        className="grid gap-2.5"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {matches.map((m, i) => {
          const { row, col, flow } = snakePlacement(i, matches.length, cols)
          const dragging = drag?.id === m.id
          const target = drag?.targetId === m.id
          const { id, ...rest } = m
          const card = (
            <MatchCard
              {...rest}
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
              style={{
                gridRow: row + 1,
                gridColumn: col + 1,
                transform: dragging && drag ? `translate(${drag.dx}px, ${drag.dy}px)` : undefined,
              }}
              className={cn(
                'relative min-w-0 rounded-lg',
                dragging && 'pointer-events-none z-[5] opacity-[0.92] shadow-pop',
                target && 'outline-2 outline-dashed outline-accent outline-offset-2',
              )}
            >
              {onSwapSides ? (
                <SwapSidesArea onSwap={(from, to) => onSwapSides(id, from, to)}>
                  {card}
                </SwapSidesArea>
              ) : (
                card
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
