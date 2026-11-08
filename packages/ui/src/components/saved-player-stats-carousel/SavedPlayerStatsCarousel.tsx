'use client'

import type { SavedPlayerStats } from '@rotra/data/club-player/types'
import { Button } from '@rotra/ui/button'
import { cn } from '@rotra/ui/cn'
import { Skeleton } from '@rotra/ui/skeleton'
import useEmblaCarousel from 'embla-carousel-react'
import { useReducedMotion } from 'motion/react'
import { useEffect, useId, useState } from 'react'

export type SavedPlayerStatsCarouselProps = {
  /** Omit while loading. Zero counts are real data, never a loading fallback. */
  stats?: SavedPlayerStats
  cards?: { key: string; label: string; value?: number; active?: boolean; onSelect?: () => void }[]
  label?: string
  caption?: string
}

const CARDS = [
  ['totalPlayers', 'Total players'],
  ['totalRegistered', 'Total registered'],
  ['totalBeginners', 'Total beginners'],
  ['totalIntermediates', 'Total intermediates'],
  ['totalAdvanced', 'Total advanced'],
  ['newPlayersThisWeek', 'New players this week'],
] as const satisfies ReadonlyArray<readonly [keyof SavedPlayerStats, string]>

/** Club-wide statistics above the Saved players filters; never rotates automatically. */
export function SavedPlayerStatsCarousel({
  stats,
  cards,
  label = 'Saved player statistics',
  caption = 'All saved players · This week starts Monday (Asia/Manila)',
}: SavedPlayerStatsCarouselProps) {
  const items =
    cards ??
    CARDS.map(([key, label]) => ({
      key,
      label,
      value: stats?.[key],
      active: false,
      onSelect: undefined,
    }))
  const viewportId = useId()
  const reducedMotion = useReducedMotion()
  const [viewportRef, api] = useEmblaCarousel({ align: 'start', loop: false })
  const [controls, setControls] = useState({ previous: false, next: false })

  useEffect(() => {
    if (!api) return
    const update = () => setControls({ previous: api.canScrollPrev(), next: api.canScrollNext() })
    update()
    // reInit also fires on resize, so the arrows and fades follow the viewport size.
    api.on('select', update).on('scroll', update).on('reInit', update).on('resize', update)
    return () => {
      api.off('select', update).off('scroll', update).off('reInit', update).off('resize', update)
    }
  }, [api])

  const previous = () => api?.scrollPrev(!!reducedMotion)
  const next = () => api?.scrollNext(!!reducedMotion)
  const overflow = controls.previous || controls.next

  return (
    <section
      aria-label={label}
      aria-roledescription="carousel"
      aria-busy={items.some((item) => item.value === undefined)}
      className="min-w-0"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-[13px] text-fg2">{caption}</p>
        {/* Arrows and edge fades only exist while the cards overflow. */}
        <div className={cn('flex shrink-0 gap-2', !overflow && 'hidden')}>
          <Button
            size="sm"
            className="min-h-11 min-w-11"
            aria-label="Previous statistics"
            aria-controls={viewportId}
            disabled={!controls.previous}
            onClick={previous}
          >
            <span aria-hidden>←</span>
          </Button>
          <Button
            size="sm"
            className="min-h-11 min-w-11"
            aria-label="Next statistics"
            aria-controls={viewportId}
            disabled={!controls.next}
            onClick={next}
          >
            <span aria-hidden>→</span>
          </Button>
        </div>
      </div>
      <div className="relative">
        <div
          aria-hidden
          className={cn(
            'pointer-events-none absolute inset-y-0 left-0 z-[1] w-14 bg-linear-to-r from-bg to-transparent opacity-0 transition-opacity duration-150 motion-reduce:transition-none',
            controls.previous && 'opacity-100',
          )}
        />
        <div
          aria-hidden
          className={cn(
            'pointer-events-none absolute inset-y-0 right-0 z-[1] w-14 bg-linear-to-l from-bg to-transparent opacity-0 transition-opacity duration-150 motion-reduce:transition-none',
            controls.next && 'opacity-100',
          )}
        />
        {/* biome-ignore lint/a11y/useSemanticElements: ARIA carousel groups are not form fieldsets. */}
        <div
          id={viewportId}
          ref={viewportRef}
          role="group"
          aria-label="Statistics cards. Use left and right arrow keys."
          // biome-ignore lint/a11y/noNoninteractiveTabindex: This viewport scrolls with arrow keys.
          tabIndex={0}
          className="overflow-hidden rounded-2xl"
          onKeyDown={(event) => {
            if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
              event.preventDefault()
              if (event.key === 'ArrowLeft') previous()
              else next()
            }
          }}
        >
          <div className="flex touch-pan-y touch-pinch-zoom gap-3">
            {items.map(({ key, label, value, active, onSelect }, index) => {
              const content = (
                <>
                  <span className="text-[13px] font-semibold text-fg2">{label}</span>
                  {value !== undefined ? (
                    <strong className="mt-2 block text-[32px] leading-none font-extrabold tabular-nums">
                      {value.toLocaleString('en-US')}
                    </strong>
                  ) : (
                    <Skeleton className="mt-2 h-8 w-16" label={`Loading ${label.toLowerCase()}`} />
                  )}
                </>
              )
              return (
                // biome-ignore lint/a11y/useSemanticElements: ARIA carousel slides use group roles.
                <div
                  key={key}
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`${index + 1} of ${items.length}: ${label}`}
                  className={
                    cards
                      ? 'min-w-0 flex-[0_0_160px] min-[1280px]:flex-[1_0_0]'
                      : 'min-w-0 flex-[0_0_224px]'
                  }
                >
                  {onSelect ? (
                    <button
                      type="button"
                      aria-pressed={active}
                      onClick={onSelect}
                      className="h-full w-full rounded-2xl border border-border-strong bg-surface p-4 text-left aria-pressed:border-accent aria-pressed:bg-accent-subtle"
                    >
                      {content}
                    </button>
                  ) : (
                    <div className="rounded-2xl border border-border-strong bg-surface p-4">
                      {content}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
