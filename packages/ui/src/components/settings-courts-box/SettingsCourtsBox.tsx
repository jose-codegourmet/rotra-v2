'use client'

import { AddCourtTile } from '@rotra/ui/add-court-tile'
import { Button } from '@rotra/ui/button'
import { cn } from '@rotra/ui/cn'
import { startOfDay } from '@rotra/ui/date-time-picker/helpers'
import { PHONE_QUERY, useMediaQuery } from '@rotra/ui/hooks/use-media-query'
import { sessionEndStatus } from '@rotra/ui/overdue-banner'
import { SettingsCourtCard, type SettingsCourtCardProps } from '@rotra/ui/settings-court-card'
import { whenText } from '@rotra/ui/settings-court-card/helpers'
import { toast } from '@rotra/ui/toaster'
import useEmblaCarousel from 'embla-carousel-react'
import { useCallback, useEffect, useRef, useState } from 'react'

/** One court in the box: the card's data, keyed by the court's id. */
export type SettingsCourtsBoxCourt = Pick<
  SettingsCourtCardProps,
  'label' | 'state' | 'teamA' | 'teamB' | 'from' | 'until' | 'followsSessionEnd'
> & { id: string }

export type SettingsCourtsBoxProps = {
  courts: SettingsCourtsBoxCourt[]
  /** The session's planned end, epoch ms */
  sessionEnd: number
  /** The current time; stories pass a fixed one so "N h left" stays stable */
  now: number
  onChangeFrom: (courtId: string, from: number) => void
  onChangeUntil: (courtId: string, until: number) => void
  onFollowSessionEnd: (courtId: string) => void
  /** Extend 30 min or Extend 1 h; the box toasts "Session ends at TIME · public page updates after sync" */
  onExtend: (minutes: 30 | 60) => void
  /** Opens the existing Add court dialog */
  onAddCourt: () => void
  className?: string
}

const EXTENDS = [
  { minutes: 30, label: 'Extend 30 min' },
  { minutes: 60, label: 'Extend 1 h' },
] as const

/**
 * The Courts box of the Settings tab (the prototype's liveSettings() courts): "Courts · N" with
 * "Session ends TIME · N h left" (or "Planned end passed …" in warn) and Extend buttons, then one
 * SettingsCourtCard per court and a last Add court tile. The layout follows the box's own width: two a
 * row under 1000 px, from 1000 px as many as fit at 350 px, stretched. On phones (640 px and
 * narrower) it is an Embla slider, one court a slide at 86% with dots; the slide survives re-renders.
 */
export function SettingsCourtsBox({
  courts,
  sessionEnd,
  now,
  onChangeFrom,
  onChangeUntil,
  onFollowSessionEnd,
  onExtend,
  onAddCourt,
  className,
}: SettingsCourtsBoxProps) {
  const phone = useMediaQuery(PHONE_QUERY)
  const [viewportRef, api] = useEmblaCarousel({
    align: 'start',
    containScroll: 'trimSnaps',
    active: phone,
  })
  // The slide the person is on, kept in a ref so a re-render or a re-init (a court added, a time
  // edited) brings the slider back to it instead of slide 1.
  const slideRef = useRef(0)
  const [slide, setSlide] = useState(0)
  const count = courts.length + 1
  const status = sessionEndStatus(sessionEnd, now)

  const syncSlide = useCallback(() => {
    if (!api) return
    slideRef.current = api.selectedScrollSnap()
    setSlide(slideRef.current)
  }, [api])

  useEffect(() => {
    if (!api) return
    const restore = () => {
      const last = Math.max(0, api.scrollSnapList().length - 1)
      const wanted = Math.min(slideRef.current, last)
      if (api.selectedScrollSnap() !== wanted) api.scrollTo(wanted, true)
      syncSlide()
    }
    restore()
    api.on('select', syncSlide).on('reInit', restore)
    return () => {
      api.off('select', syncSlide).off('reInit', restore)
    }
  }, [api, syncSlide])

  const extend = (minutes: 30 | 60) => {
    onExtend(minutes)
    const next = sessionEnd + minutes * 60_000
    const at = startOfDay(next) === startOfDay(now) ? 'at ' : ''
    toast(`Session ends ${at}${whenText(next, now)} · public page updates after sync`)
  }

  const slideClass = cn('flex min-w-0 *:h-full *:w-full', phone && 'flex-[0_0_86%] mr-3')
  const names = [...courts.map((court) => court.label), 'Add court']

  return (
    <section
      aria-labelledby="settings-courts-heading"
      className={cn(
        '@container min-w-0 rounded-lg border border-border bg-surface p-4 shadow-card',
        'flex flex-col gap-3',
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h3 id="settings-courts-heading" className="text-base">
            Courts · {courts.length}
          </h3>
          <span className={cn('text-[13px]', status.over ? 'text-warn' : 'text-fg2')}>
            Session ends {whenText(sessionEnd, now)} · {status.text}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {EXTENDS.map(({ minutes, label }) => (
            <Button key={minutes} size="sm" onClick={() => extend(minutes)}>
              {label}
            </Button>
          ))}
        </div>
      </div>
      <div
        ref={viewportRef}
        aria-roledescription={phone ? 'carousel' : undefined}
        className={cn(phone && '-mx-0.5 overflow-hidden p-0.5')}
      >
        <div
          className={
            phone
              ? 'flex touch-pan-y touch-pinch-zoom'
              : 'grid grid-cols-2 gap-3 @[1000px]:grid-cols-[repeat(auto-fit,minmax(350px,1fr))]'
          }
        >
          {courts.map(({ id, ...court }, index) => (
            // biome-ignore lint/a11y/useSemanticElements: ARIA carousel slides use group roles.
            <div
              key={id}
              role={phone ? 'group' : undefined}
              aria-roledescription={phone ? 'slide' : undefined}
              aria-label={phone ? `${index + 1} of ${count}: ${court.label}` : undefined}
              className={slideClass}
            >
              <SettingsCourtCard
                {...court}
                sessionEnd={sessionEnd}
                onChangeFrom={(from) => onChangeFrom(id, from)}
                onChangeUntil={(until) => onChangeUntil(id, until)}
                onFollowSessionEnd={() => onFollowSessionEnd(id)}
              />
            </div>
          ))}
          {/* biome-ignore lint/a11y/useSemanticElements: ARIA carousel slides use group roles. */}
          <div
            role={phone ? 'group' : undefined}
            aria-roledescription={phone ? 'slide' : undefined}
            aria-label={phone ? `${count} of ${count}: Add court` : undefined}
            className={slideClass}
          >
            <AddCourtTile
              nextNumber={courts.length + 1}
              description="Set its label and hours"
              onAdd={onAddCourt}
            />
          </div>
        </div>
      </div>
      {phone ? (
        // biome-ignore lint/a11y/useSemanticElements: A named group of buttons, not a form fieldset.
        <div role="group" aria-label="Courts" className="flex justify-center gap-0.5">
          {names.map((name, index) => (
            <button
              // biome-ignore lint/suspicious/noArrayIndexKey: Dots follow the slides by position.
              key={index}
              type="button"
              aria-label={`Show ${name}`}
              aria-current={index === slide}
              onClick={() => api?.scrollTo(index)}
              className="group grid h-6 min-w-6 cursor-pointer place-items-center border-0 bg-transparent p-0"
            >
              <span
                aria-hidden
                className={cn(
                  'h-2 rounded-full bg-border-strong transition-[width,background-color] duration-200 motion-reduce:transition-none',
                  index === slide ? 'w-[22px] bg-accent' : 'w-2',
                )}
              />
            </button>
          ))}
        </div>
      ) : null}
    </section>
  )
}
