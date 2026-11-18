'use client'

import { cn } from '@rotra/ui/cn'
import {
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'

export type SnapCarouselItem = {
  /** Stable id: also what `startAt` names */
  id: string
  node: ReactNode
}

export type SnapCarouselProps = {
  items: SnapCarouselItem[]
  /** Accessible name of the strip: “Images”, “Identities” */
  label: string
  /** The item the strip opens centred on */
  startAt?: string
  /** Extra classes for the strip (padding, alignment, card width variables) */
  className?: string
  /** Extra classes for the wrapper around every item */
  itemClassName?: string
  /** Mouse drags that start inside a match of this selector scroll nothing (the eye button) */
  dragIgnore?: string
}

/**
 * The share dialog's carousel (2026-11-13 share dialog logs), shared by ShareImagePicker and
 * IdentityPicker: one horizontal strip, mouse drag or touch swipe, native scroll-snapping to the
 * centre, a drag never counts as a click, a fade mask only on a side with hidden items, and dots
 * under the strip for the centred item.
 */
export function SnapCarousel({
  items,
  label,
  startAt,
  className,
  itemClassName,
  dragIgnore,
}: SnapCarouselProps) {
  const idsKey = items.map((item) => item.id).join('|')
  const [edges, setEdges] = useState({ left: false, right: false, active: 0 })
  const [dragging, setDragging] = useState(false)
  const stripRef = useRef<HTMLDivElement>(null)
  const drag = useRef<{ x: number; left: number } | null>(null)
  const moved = useRef(false)

  // The prototypes' shCarSync: masks on the sides with hidden items, the dot of the centred item.
  const sync = useCallback(() => {
    const el = stripRef.current
    if (!el) return
    const max = el.scrollWidth - el.clientWidth - 2
    const mid = el.scrollLeft + el.clientWidth / 2
    let active = 0
    let best = Number.POSITIVE_INFINITY
    Array.from(el.children).forEach((child, index) => {
      const item = child as HTMLElement
      const distance = Math.abs(item.offsetLeft + item.offsetWidth / 2 - mid)
      if (distance < best) {
        best = distance
        active = index
      }
    })
    setEdges({ left: el.scrollLeft > 2, right: el.scrollLeft < max, active })
  }, [])
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-measure when the set of items changes
  useEffect(() => {
    const el = stripRef.current
    if (!el) return
    sync()
    const observer = new ResizeObserver(sync)
    observer.observe(el)
    return () => observer.disconnect()
  }, [sync, idsKey])

  // Opens centred on `startAt` (once per set of items).
  // biome-ignore lint/correctness/useExhaustiveDependencies: only when the set of items changes
  useEffect(() => {
    const el = stripRef.current
    const index = startAt ? items.findIndex((item) => item.id === startAt) : -1
    const child = index > 0 ? (el?.children[index] as HTMLElement | undefined) : undefined
    if (!el || !child) return
    el.scrollLeft = child.offsetLeft + child.offsetWidth / 2 - el.clientWidth / 2
    sync()
  }, [idsKey, startAt])

  // Mouse drag scrolls the strip; touch scrolls natively.
  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const el = stripRef.current
    if (!el || event.pointerType !== 'mouse' || event.button !== 0) return
    if (dragIgnore && (event.target as Element).closest(dragIgnore)) return
    drag.current = { x: event.clientX, left: el.scrollLeft }
    moved.current = false
    const move = (e: PointerEvent) => {
      const d = drag.current
      if (!d) return
      const dx = e.clientX - d.x
      if (!moved.current && Math.abs(dx) > 6) {
        moved.current = true
        setDragging(true)
      }
      if (moved.current) el.scrollLeft = d.left - dx
    }
    const up = () => {
      drag.current = null
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      if (moved.current) {
        setDragging(false)
        setTimeout(() => {
          moved.current = false
        }, 0)
      }
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  // Masks are alpha only: the gradient colour never shows.
  const mask =
    edges.left && edges.right
      ? '[mask-image:linear-gradient(90deg,transparent,black_64px,black_calc(100%-64px),transparent)]'
      : edges.left
        ? '[mask-image:linear-gradient(90deg,transparent,black_64px)]'
        : edges.right
          ? '[mask-image:linear-gradient(270deg,transparent,black_64px)]'
          : ''

  return (
    <>
      {/* biome-ignore lint/a11y/useSemanticElements: an ARIA carousel group is not a form fieldset. */}
      <div
        ref={stripRef}
        role="group"
        aria-label={label}
        onScroll={sync}
        onPointerDown={onPointerDown}
        onClickCapture={(event) => {
          if (moved.current) {
            event.preventDefault()
            event.stopPropagation()
            moved.current = false
          }
        }}
        className={cn(
          'flex w-full cursor-grab snap-x snap-mandatory scroll-px-6 items-start gap-5 overflow-x-auto overscroll-x-contain px-6 pt-3 pb-1.5 select-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&_img]:[-webkit-user-drag:none] [&_svg]:[-webkit-user-drag:none]',
          dragging && 'cursor-grabbing snap-none [&_*]:pointer-events-none',
          mask,
          className,
        )}
      >
        {items.map((item) => (
          <div key={item.id} className={cn('flex-none snap-center', itemClassName)}>
            {item.node}
          </div>
        ))}
      </div>
      {items.length > 1 ? (
        <div aria-hidden="true" className="flex justify-center gap-1.5">
          {items.map((item, index) => (
            <i
              key={item.id}
              className={cn(
                'block h-[7px] rounded-full',
                index === edges.active ? 'w-[18px] bg-accent' : 'w-[7px] bg-border-strong',
              )}
            />
          ))}
        </div>
      ) : null}
    </>
  )
}
