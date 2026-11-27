'use client'

import { cn } from '@rotra/ui/cn'
import { Icon } from '@rotra/ui/icon'
import { IconButton } from '@rotra/ui/icon-button'
import useEmblaCarousel from 'embla-carousel-react'
import { useReducedMotion } from 'motion/react'
import { type ReactNode, useCallback, useEffect, useId, useState } from 'react'

export type CardCarouselItem = {
  /** Stable id */
  id: string
  node: ReactNode
}

export type CardCarouselProps = {
  items: CardCarouselItem[]
  /** Accessible name of the carousel: "Courts", "Matches" */
  label: string
  /** Accessible name of the previous arrow: "Previous court" */
  previousLabel: string
  /** Accessible name of the next arrow: "Next court" */
  nextLabel: string
  /** Accessible name of dot `n` (1-based): "Go to slide 2" */
  dotLabel?: (n: number) => string
  /**
   * Size of one slide, as Tailwind classes on the slide wrapper. The courts use
   * `COURT_SLIDE_CLASS` (one slide with the next peeking, two from 760 px, three from 1200 px).
   */
  slideClassName: string
  /** The slide the carousel opens on */
  startIndex?: number
  /** Called with the selected slide when it changes */
  onSelect?: (index: number) => void
  className?: string
}

/** Courts Slide mode: 88% on phones, two from 760 px, three from 1200 px; 12 px between slides. */
export const COURT_SLIDE_CLASS =
  'mr-3 basis-[88%] min-[760px]:basis-[calc(50%-6px)] min-[1200px]:basis-[calc(33.333%-8px)]'

/** One slide at a time, the next peeking: Put a match on Court N. */
export const SINGLE_SLIDE_CLASS = 'mr-3 basis-[92%]'

// A drag that starts on a button, field, label or switch inside a slide does not swipe.
const DRAG_IGNORE = 'button, input, label, a, [role="switch"]'

// Alpha-only side fades (48 px), only on a side that has more slides.
const MASK_BOTH =
  '[mask-image:linear-gradient(to_right,transparent,#000_48px,#000_calc(100%-48px),transparent)]'
const MASK_LEFT = '[mask-image:linear-gradient(to_right,transparent,#000_48px)]'
const MASK_RIGHT = '[mask-image:linear-gradient(to_right,#000_calc(100%-48px),transparent)]'

/**
 * The prototypes' Embla card carousel (`.cs-wrap` Courts Slide mode and `.ch-wrap` Put a match on
 * Court N): a track of slides you drag or swipe, previous and next arrows and dots under it, and a
 * side gradient mask only while there are more slides that way. Reduced motion jumps instead of
 * scrolling.
 */
export function CardCarousel({
  items,
  label,
  previousLabel,
  nextLabel,
  dotLabel = (n) => `Go to slide ${n}`,
  slideClassName,
  startIndex = 0,
  onSelect,
  className,
}: CardCarouselProps) {
  const viewportId = useId()
  const reduced = !!useReducedMotion()
  const [viewportRef, api] = useEmblaCarousel({
    align: 'start',
    containScroll: 'trimSnaps',
    startIndex,
    // Reduced motion: a swipe or a button lands on the slide at once
    duration: reduced ? 0 : 25,
    watchDrag: (_, event) =>
      !(event.target instanceof Element && event.target.closest(DRAG_IGNORE)),
  })
  const [state, setState] = useState({ prev: false, next: false, selected: startIndex, snaps: 0 })
  const idsKey = items.map((item) => item.id).join('|')

  const update = useCallback(() => {
    if (!api) return
    setState({
      prev: api.canScrollPrev(),
      next: api.canScrollNext(),
      selected: api.selectedScrollSnap(),
      snaps: api.scrollSnapList().length,
    })
  }, [api])

  useEffect(() => {
    if (!api) return
    update()
    api.on('select', update).on('reInit', update).on('resize', update)
    return () => {
      api.off('select', update).off('reInit', update).off('resize', update)
    }
  }, [api, update])

  // The set of slides changed (a court added): re-measure.
  // biome-ignore lint/correctness/useExhaustiveDependencies: only when the set of slides changes
  useEffect(() => {
    api?.reInit()
  }, [api, idsKey])

  useEffect(() => {
    onSelect?.(state.selected)
  }, [state.selected, onSelect])

  const mask =
    state.prev && state.next
      ? MASK_BOTH
      : state.prev
        ? MASK_LEFT
        : state.next
          ? MASK_RIGHT
          : undefined

  return (
    // biome-ignore lint/a11y/useSemanticElements: an ARIA carousel is not a form fieldset.
    <div role="group" aria-roledescription="carousel" aria-label={label} className={className}>
      <div
        id={viewportId}
        ref={viewportRef}
        className={cn('-mx-0.5 -my-1 overflow-hidden px-0.5 py-1', mask)}
      >
        <div className="flex touch-pan-y">
          {items.map((item) => (
            <div key={item.id} className={cn('min-w-0 flex-none', slideClassName)}>
              {item.node}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-2.5 flex items-center justify-center gap-2.5">
        <IconButton
          variant="ghost"
          size="sm"
          label={previousLabel}
          aria-controls={viewportId}
          disabled={!state.prev}
          onClick={() => api?.scrollPrev(reduced)}
        >
          <Icon name="back" />
        </IconButton>
        {/* biome-ignore lint/a11y/useSemanticElements: a row of dot buttons; a fieldset would change the drawn layout */}
        <div role="group" aria-label={`${label} slides`} className="flex gap-1.5">
          {Array.from({ length: state.snaps }, (_, k) => k).map((k) => (
            <button
              // biome-ignore lint/suspicious/noArrayIndexKey: dots are positional
              key={k}
              type="button"
              aria-label={dotLabel(k + 1)}
              aria-current={k === state.selected}
              onClick={() => api?.scrollTo(k, reduced)}
              className={cn(
                'h-2 cursor-pointer rounded-full border-0 p-0 transition-[width,background-color] duration-200 motion-reduce:transition-none',
                k === state.selected ? 'w-[22px] bg-accent' : 'w-2 bg-border-strong',
              )}
            />
          ))}
        </div>
        <IconButton
          variant="ghost"
          size="sm"
          label={nextLabel}
          aria-controls={viewportId}
          disabled={!state.next}
          onClick={() => api?.scrollNext(reduced)}
        >
          <Icon name="back" className="rotate-180" />
        </IconButton>
      </div>
    </div>
  )
}
