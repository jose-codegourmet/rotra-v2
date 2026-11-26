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
import {
  type KeyboardEvent,
  type PointerEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'

/** One court in the box: the card's data, keyed by the court's id. */
export type SettingsCourtsBoxCourt = Pick<
  SettingsCourtCardProps,
  | 'label'
  | 'state'
  | 'teamA'
  | 'teamB'
  | 'from'
  | 'until'
  | 'followsSessionEnd'
  | 'playingSince'
  | 'freeSince'
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
  /**
   * The courts' new order (every court id) after a drag or an arrow key on a card's ⠿ handle; called
   * once, only when the order changed. The box toasts "COURT moved to position N". No handles without it.
   */
  onReorder?: (courtIds: string[]) => void
  /** The court label was pressed: open the Change court label dialog. A plain label without it. */
  onRename?: (courtId: string) => void
  className?: string
}

/** A court being dragged by its handle. Pointer moves mutate it in a ref; only order changes re-render. */
type Drag = {
  id: string
  pointerId: number
  /** Where the card was grabbed, from its top-left corner */
  gx: number
  gy: number
  /** The pointer now */
  x: number
  y: number
  /** Past the 4 px threshold: the card is lifted */
  moved: boolean
  /** The order shown while dragging (the drop spot) */
  order: string[]
  /** The order when the drag began */
  start: string[]
  /** Last time the phone slider was nudged from an edge */
  edgeAt: number
}

const DRAG_THRESHOLD = 4
const EDGE = 32
const EDGE_WAIT_MS = 600
const REFLOW_MS = 150

type EmblaApi = NonNullable<ReturnType<typeof useEmblaCarousel>[1]>

// The slider swipes from anywhere except a court's drag handle.
const watchDrag = (_: EmblaApi, event: MouseEvent | TouchEvent) =>
  !(event.target instanceof Element && event.target.closest('[data-court-grip]'))

const moveId = (ids: string[], from: number, to: number) => {
  const next = [...ids]
  const [id] = next.splice(from, 1)
  if (id !== undefined) next.splice(to, 0, id)
  return next
}
const sameOrder = (a: string[], b: string[]) =>
  a.length === b.length && a.every((id, i) => id === b[i])
const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

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
 * With onReorder each card has a ⠿ handle: drag it (pointer events, the card lifts and follows the
 * pointer, the others make room) or press the arrow keys on it; Escape cancels. Add court stays last.
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
  onReorder,
  onRename,
  className,
}: SettingsCourtsBoxProps) {
  const phone = useMediaQuery(PHONE_QUERY)
  const [viewportRef, api] = useEmblaCarousel({
    align: 'start',
    containScroll: 'trimSnaps',
    active: phone,
    watchDrag,
  })
  // The slide the person is on, kept in a ref so a re-render or a re-init (a court added, a time
  // edited) brings the slider back to it instead of slide 1.
  const slideRef = useRef(0)
  const [slide, setSlide] = useState(0)
  const count = courts.length + 1
  const status = sessionEndStatus(sessionEnd, now)

  // Reorder. The order the box shows: while dragging, the drop spot; after a drop or an arrow key,
  // the new order until the courts arrive in it (or in any other order); otherwise the courts' own.
  const propIds = courts.map((court) => court.id)
  const propKey = propIds.join('|')
  const [local, setLocal] = useState<{ base: string; ids: string[] } | null>(null)
  const [drag, setDragState] = useState<Drag | null>(null)
  const dragRef = useRef<Drag | null>(null)
  const slotRefs = useRef(new Map<string, HTMLDivElement>())
  const flipRef = useRef<Map<string, DOMRect> | null>(null)
  const focusRef = useRef<string | null>(null)
  const baseOrder = local && local.base === propKey ? local.ids : propIds
  const shownOrder = drag?.moved ? drag.order : baseOrder
  const order = [
    ...shownOrder.filter((id) => propIds.includes(id)),
    ...propIds.filter((id) => !shownOrder.includes(id)),
  ]
  const byId = new Map(courts.map((court) => [court.id, court]))
  const ordered = order.flatMap((id) => {
    const court = byId.get(id)
    return court ? [court] : []
  })

  const setDrag = (next: Drag | null) => {
    dragRef.current = next
    setDragState(next)
  }

  /** Remember every card's place on screen so the next layout can slide them from there. */
  const snapshot = () => {
    if (reducedMotion()) return
    const rects = new Map<string, DOMRect>()
    for (const [id, el] of slotRefs.current) rects.set(id, el.getBoundingClientRect())
    flipRef.current = rects
  }

  /** Put the lifted card under the pointer, wherever it now sits in the layout. */
  const follow = useCallback(() => {
    const d = dragRef.current
    const el = d?.moved ? slotRefs.current.get(d.id) : undefined
    if (!d || !el) return
    el.style.transform = ''
    const r = el.getBoundingClientRect()
    el.style.transform = `translate(${d.x - d.gx - r.left}px, ${d.y - d.gy - r.top}px)`
  }, [])

  const commit = (id: string, next: string[]) => {
    const to = next.indexOf(id)
    setLocal({ base: propKey, ids: next })
    onReorder?.(next)
    toast(`${byId.get(id)?.label ?? 'Court'} moved to position ${to + 1}`)
    focusRef.current = id
    slideRef.current = to
  }

  const endDrag = (apply: boolean) => {
    const d = dragRef.current
    if (!d) return
    const el = slotRefs.current.get(d.id)
    if (d.moved) snapshot()
    if (el) el.style.transform = ''
    setDrag(null)
    if (!d.moved) return
    if (apply && !sameOrder(d.order, d.start)) commit(d.id, d.order)
    else focusRef.current = d.id
  }
  const endDragRef = useRef(endDrag)
  endDragRef.current = endDrag

  // Escape puts the dragged court back where it was.
  const dragging = drag !== null
  useEffect(() => {
    if (!dragging) return
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      endDragRef.current(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dragging])

  // After an order change: slide the other cards from their old places (no motion when reduced),
  // keep the lifted card under the pointer, and give the handle its focus back.
  useLayoutEffect(() => {
    const rects = flipRef.current
    flipRef.current = null
    const liftedId = dragRef.current?.moved ? dragRef.current.id : null
    if (rects) {
      for (const [id, el] of slotRefs.current) {
        const before = rects.get(id)
        if (!before || id === liftedId) continue
        const after = el.getBoundingClientRect()
        const dx = before.left - after.left
        const dy = before.top - after.top
        if (dx || dy)
          el.animate(
            [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'translate(0, 0)' }],
            { duration: REFLOW_MS, easing: 'ease-out' },
          )
      }
    }
    follow()
    const focusId = focusRef.current
    if (!focusId) return
    focusRef.current = null
    slotRefs.current
      .get(focusId)
      ?.querySelector<HTMLElement>('[data-court-grip]')
      ?.focus({ preventScroll: true })
    if (phone && api) api.scrollTo(slideRef.current)
  })

  // The slider moved under a lifted card (an edge nudge or a re-init): keep it under the pointer.
  useEffect(() => {
    if (!api) return
    api.on('scroll', follow).on('reInit', follow)
    return () => {
      api.off('scroll', follow).off('reInit', follow)
    }
  }, [api, follow])

  const handleProps = (id: string, index: number): SettingsCourtCardProps['handleProps'] => ({
    className: drag?.moved && drag.id === id ? 'cursor-grabbing' : undefined,
    onPointerDown: (e: PointerEvent<HTMLButtonElement>) => {
      const el = slotRefs.current.get(id)
      if (e.button !== 0 || dragRef.current || !el) return
      e.preventDefault()
      e.currentTarget.focus({ preventScroll: true })
      try {
        e.currentTarget.setPointerCapture(e.pointerId)
      } catch {
        // capture unsupported
      }
      const r = el.getBoundingClientRect()
      setDrag({
        id,
        pointerId: e.pointerId,
        gx: e.clientX - r.left,
        gy: e.clientY - r.top,
        x: e.clientX,
        y: e.clientY,
        moved: false,
        order,
        start: order,
        edgeAt: 0,
      })
    },
    onPointerMove: (e: PointerEvent<HTMLButtonElement>) => {
      const d = dragRef.current
      const el = slotRefs.current.get(id)
      if (!d || d.id !== id || d.pointerId !== e.pointerId || !el) return
      d.x = e.clientX
      d.y = e.clientY
      if (!d.moved) {
        const r = el.getBoundingClientRect()
        if (Math.hypot(d.x - d.gx - r.left, d.y - d.gy - r.top) < DRAG_THRESHOLD) return
        setDrag({ ...d, moved: true })
      }
      const lifted = dragRef.current ?? d
      // The court card under the pointer: the lifted card takes its place.
      const over = lifted.order.find((other) => {
        if (other === id) return false
        const b = slotRefs.current.get(other)?.getBoundingClientRect()
        return !!b && d.x >= b.left && d.x <= b.right && d.y >= b.top && d.y <= b.bottom
      })
      if (over) {
        const from = lifted.order.indexOf(id)
        const to = lifted.order.indexOf(over)
        if (from !== to) {
          snapshot()
          setDrag({ ...lifted, order: moveId(lifted.order, from, to) })
        }
      }
      // Phones: held near the slider's edge, show the next or previous court.
      if (phone && api && Date.now() - lifted.edgeAt > EDGE_WAIT_MS) {
        const b = api.rootNode().getBoundingClientRect()
        const current = dragRef.current
        if (current && d.x > b.right - EDGE) {
          current.edgeAt = Date.now()
          api.scrollNext()
        } else if (current && d.x < b.left + EDGE) {
          current.edgeAt = Date.now()
          api.scrollPrev()
        }
      }
      follow()
    },
    onPointerUp: (e: PointerEvent<HTMLButtonElement>) => {
      if (dragRef.current?.pointerId === e.pointerId) endDrag(true)
    },
    onPointerCancel: (e: PointerEvent<HTMLButtonElement>) => {
      if (dragRef.current?.pointerId === e.pointerId) endDrag(false)
    },
    onKeyDown: (e: KeyboardEvent<HTMLButtonElement>) => {
      const earlier = e.key === 'ArrowLeft' || e.key === 'ArrowUp'
      const later = e.key === 'ArrowRight' || e.key === 'ArrowDown'
      if ((!earlier && !later) || dragRef.current) return
      e.preventDefault()
      const to = earlier ? index - 1 : index + 1
      if (to < 0 || to >= order.length) return
      snapshot()
      commit(id, moveId(order, index, to))
    },
  })

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
  const names = [...ordered.map((court) => court.label), 'Add court']

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
      {/* biome-ignore lint/a11y/useSemanticElements: the ARIA carousel container is a group. */}
      <div
        ref={viewportRef}
        role="group"
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
          {ordered.map(({ id, ...court }, index) => (
            // biome-ignore lint/a11y/useSemanticElements: ARIA carousel slides use group roles.
            <div
              key={id}
              ref={(el) => {
                if (el) slotRefs.current.set(id, el)
                else slotRefs.current.delete(id)
              }}
              role="group"
              aria-roledescription={phone ? 'slide' : undefined}
              aria-label={phone ? `${index + 1} of ${count}: ${court.label}` : undefined}
              className={cn(
                slideClass,
                drag?.moved &&
                  drag.id === id &&
                  'pointer-events-none relative z-[5] rounded-lg opacity-[0.92] shadow-pop',
              )}
            >
              <SettingsCourtCard
                {...court}
                sessionEnd={sessionEnd}
                now={now}
                onChangeFrom={(from) => onChangeFrom(id, from)}
                onChangeUntil={(until) => onChangeUntil(id, until)}
                onFollowSessionEnd={() => onFollowSessionEnd(id)}
                onRename={onRename ? () => onRename(id) : undefined}
                handleProps={onReorder ? handleProps(id, index) : undefined}
              />
            </div>
          ))}
          {/* biome-ignore lint/a11y/useSemanticElements: ARIA carousel slides use group roles. */}
          <div
            role="group"
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
