'use client'

import type { SavedPlayerStats } from '@rotra/data/club-player/types'
import { Button } from '@rotra/ui/button'
import { Skeleton } from '@rotra/ui/skeleton'
import useEmblaCarousel from 'embla-carousel-react'
import { useReducedMotion } from 'motion/react'
import { useEffect, useId, useState } from 'react'

export type SavedPlayerStatsCarouselProps = {
  /** Omit while loading. Zero counts are real data, never a loading fallback. */
  stats?: SavedPlayerStats
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
export function SavedPlayerStatsCarousel({ stats }: SavedPlayerStatsCarouselProps) {
  const viewportId = useId()
  const reducedMotion = useReducedMotion()
  const [viewportRef, api] = useEmblaCarousel({ align: 'start', loop: false })
  const [controls, setControls] = useState({ previous: false, next: false })

  useEffect(() => {
    if (!api) return
    const update = () => setControls({ previous: api.canScrollPrev(), next: api.canScrollNext() })
    update()
    api.on('select', update).on('reInit', update)
    return () => {
      api.off('select', update).off('reInit', update)
    }
  }, [api])

  const previous = () => api?.scrollPrev(!!reducedMotion)
  const next = () => api?.scrollNext(!!reducedMotion)

  return (
    <section
      aria-label="Saved player statistics"
      aria-roledescription="carousel"
      aria-busy={!stats}
      className="min-w-0"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-[13px] text-fg2">
          All saved players · This week starts Monday (Asia/Manila)
        </p>
        <div className="flex shrink-0 gap-2">
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
          {CARDS.map(([key, label], index) => (
            // biome-ignore lint/a11y/useSemanticElements: ARIA carousel slides use the group role.
            <div
              key={key}
              role="group"
              aria-roledescription="slide"
              aria-label={`${index + 1} of ${CARDS.length}: ${label}`}
              className="min-w-0 flex-[0_0_224px] rounded-2xl border border-border-strong bg-surface p-4"
            >
              <span className="text-[13px] font-semibold text-fg2">{label}</span>
              {stats ? (
                <strong className="mt-2 block text-[32px] leading-none font-extrabold tabular-nums">
                  {stats[key].toLocaleString('en-US')}
                </strong>
              ) : (
                <Skeleton className="mt-2 h-8 w-16" label={`Loading ${label.toLowerCase()}`} />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
