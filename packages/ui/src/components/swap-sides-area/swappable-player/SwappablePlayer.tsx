'use client'

import { cn } from '@rotra/ui/cn'
import {
  SWAP_SIDES_HINT,
  type SwapSidesContextValue,
  type SwapSlot,
  type SwapTeam,
  useSwapSides,
} from '@rotra/ui/swap-sides-area'
import {
  type KeyboardEvent,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
} from 'react'

export type SwappablePlayerProps = {
  team: SwapTeam
  /** Position on the team, from 0 */
  index: number
  /** An empty lineup-editor slot: cannot be dragged, accepts a drop only with allowEmptyTargets */
  empty?: boolean
  /** The player element: a PlayerFaceButton, a slot button, or anything else that shows a player */
  children: ReactNode
  className?: string
}

// The prototype's .swap-ghost, .swap-src and .swap-over.
const GHOST_CLASSES = [
  'fixed',
  'z-[1000]',
  'm-0',
  'pointer-events-none',
  'opacity-[0.94]',
  'rounded-lg',
  'bg-surface',
  'shadow-pop',
]
const GHOST_LIFT_CLASSES = ['transition-[scale]', 'duration-150', 'ease-out']
const GHOST_LIFTED_CLASS = 'scale-105'
const SOURCE_CLASS = 'opacity-35'
const OVER_CLASSES = [
  'outline-2',
  'outline-dashed',
  'outline-accent',
  'outline-offset-2',
  'bg-accent-subtle',
  'rounded-lg',
]
const BODY_CLASSES = ['cursor-grabbing', '[&_*]:cursor-grabbing!']

const MOUSE_START_PX = 6
const TOUCH_SCROLL_PX = 8
const TOUCH_HOLD_MS = 280

type Drag = {
  source: HTMLElement
  slot: SwapSlot
  ctx: SwapSidesContextValue
  x: number
  y: number
  on: boolean
  touch: boolean
  ghost: HTMLElement | null
  over: HTMLElement | null
  timer: ReturnType<typeof setTimeout> | null
  cleanup: () => void
}

let drag: Drag | null = null

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

const slotOf = (el: HTMLElement): SwapSlot => ({
  team: el.dataset.swapTeam === 'B' ? 'B' : 'A',
  index: Number(el.dataset.swapIndex ?? 0),
})

function lift(d: Drag) {
  const rect = d.source.getBoundingClientRect()
  const ghost = d.source.cloneNode(true) as HTMLElement
  ghost.removeAttribute('id')
  ghost.removeAttribute('title')
  ghost.removeAttribute('data-swap-area')
  for (const el of ghost.querySelectorAll('[id]')) el.removeAttribute('id')
  ghost.setAttribute('aria-hidden', 'true')
  ghost.classList.add(...GHOST_CLASSES)
  ghost.style.left = `${rect.left}px`
  ghost.style.top = `${rect.top}px`
  ghost.style.width = `${rect.width}px`
  ghost.style.height = `${rect.height}px`
  document.body.appendChild(ghost)
  if (!reducedMotion()) {
    ghost.classList.add(...GHOST_LIFT_CLASSES)
    requestAnimationFrame(() => ghost.classList.add(GHOST_LIFTED_CLASS))
  }
  d.ghost = ghost
  d.on = true
  d.source.classList.add(SOURCE_CLASS)
  document.body.classList.add(...BODY_CLASSES)
  if (d.touch && typeof navigator.vibrate === 'function') navigator.vibrate(10)
}

function move(d: Drag, x: number, y: number) {
  if (!d.ghost) return
  d.ghost.style.transform = `translate(${x - d.x}px, ${y - d.y}px)`
  const hit = document.elementFromPoint(x, y)
  const target = hit instanceof Element ? hit.closest<HTMLElement>('[data-swap-area]') : null
  const ok =
    !!target &&
    target !== d.source &&
    target.dataset.swapArea === d.ctx.areaId &&
    target.dataset.swapTeam !== d.slot.team &&
    (target.dataset.swapEmpty !== 'true' || d.ctx.allowEmptyTargets)
  if (d.over && d.over !== target) d.over.classList.remove(...OVER_CLASSES)
  d.over = ok ? target : null
  if (d.over) d.over.classList.add(...OVER_CLASSES)
}

// The click that ends a drag must not open the profile or the slot picker.
function swallowNextClick() {
  const stop = (e: Event) => {
    e.preventDefault()
    e.stopPropagation()
    window.removeEventListener('click', stop, true)
  }
  window.addEventListener('click', stop, true)
  setTimeout(() => window.removeEventListener('click', stop, true), 400)
}

function end(apply: boolean) {
  const d = drag
  if (!d) return
  drag = null
  if (d.timer) clearTimeout(d.timer)
  d.cleanup()
  if (!d.on) return
  d.ghost?.remove()
  d.source.classList.remove(SOURCE_CLASS)
  document.body.classList.remove(...BODY_CLASSES)
  if (d.over) d.over.classList.remove(...OVER_CLASSES)
  swallowNextClick()
  if (apply && d.over) d.ctx.swap(d.slot, slotOf(d.over), false)
}

function startPointer(d: Omit<Drag, 'cleanup'>) {
  const onMove = (e: PointerEvent) => {
    if (!drag || drag.touch) return
    if (!drag.on) {
      if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < MOUSE_START_PX) return
      lift(drag)
    }
    move(drag, e.clientX, e.clientY)
  }
  const onUp = () => end(true)
  const onCancel = () => end(false)
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
  window.addEventListener('pointercancel', onCancel)
  drag = {
    ...d,
    cleanup: () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onCancel)
    },
  }
}

function startTouch(d: Omit<Drag, 'cleanup'>) {
  const onMove = (e: TouchEvent) => {
    if (!drag?.touch) return
    const p = e.touches[0]
    if (!p) return
    if (!drag.on) {
      // A quick swipe before the hold completes is a scroll, not a drag.
      if (Math.hypot(p.clientX - drag.x, p.clientY - drag.y) > TOUCH_SCROLL_PX) end(false)
      return
    }
    e.preventDefault()
    move(drag, p.clientX, p.clientY)
  }
  const onEnd = () => end(true)
  const onCancel = () => end(false)
  window.addEventListener('touchmove', onMove, { passive: false })
  window.addEventListener('touchend', onEnd)
  window.addEventListener('touchcancel', onCancel)
  const source = d.source
  drag = {
    ...d,
    timer: setTimeout(() => {
      if (drag && drag.source === source && !drag.on) lift(drag)
    }, TOUCH_HOLD_MS),
    cleanup: () => {
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onEnd)
      window.removeEventListener('touchcancel', onCancel)
    },
  }
}

/**
 * Wraps one player inside a SwapSidesArea so they can be dragged onto a player on the other team
 * (mouse or pen: after a few pixels, so a click still opens the profile or the slot picker; touch:
 * press and hold, a quick swipe still scrolls) or moved across with ← / →. During a drag a copy
 * follows the pointer, the source dims and only the other team's players show the dashed accent
 * outline. Outside a SwapSidesArea it is a plain wrapper.
 */
export function SwappablePlayer({
  team,
  index,
  empty = false,
  children,
  className,
}: SwappablePlayerProps) {
  const ctx = useSwapSides()
  const ref = useRef<HTMLDivElement>(null)
  const slot: SwapSlot = { team, index }

  useEffect(() => {
    const element = ref.current
    if (!ctx || !element) return
    return ctx.register({ team, index }, { element, empty })
  }, [ctx, team, index, empty])

  // React registers touch listeners as passive, so the hold-to-lift path attaches its own.
  useEffect(() => {
    const element = ref.current
    if (!ctx || !element || empty) return
    const onTouchStart = (e: TouchEvent) => {
      if (drag || e.touches.length > 1) return
      const p = e.touches[0]
      if (!p) return
      startTouch({
        source: element,
        slot: { team, index },
        ctx,
        x: p.clientX,
        y: p.clientY,
        on: false,
        touch: true,
        ghost: null,
        over: null,
        timer: null,
      })
    }
    element.addEventListener('touchstart', onTouchStart, { passive: true })
    return () => element.removeEventListener('touchstart', onTouchStart)
  }, [ctx, team, index, empty])

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!ctx || empty || drag || e.pointerType === 'touch' || e.button !== 0) return
    const element = ref.current
    if (!element) return
    startPointer({
      source: element,
      slot,
      ctx,
      x: e.clientX,
      y: e.clientY,
      on: false,
      touch: false,
      ghost: null,
      over: null,
      timer: null,
    })
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!ctx || empty || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return
    e.preventDefault()
    const to = ctx.opposite(slot)
    if (to) ctx.swap(slot, to, true)
  }

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: the wrapper only lifts the child card for drag and relays its arrow keys; the card inside is the focusable button
    <div
      ref={ref}
      data-swap-area={ctx?.areaId}
      data-swap-team={team}
      data-swap-index={index}
      data-swap-empty={empty || undefined}
      title={ctx && !empty ? SWAP_SIDES_HINT : undefined}
      draggable={false}
      onDragStart={(e) => e.preventDefault()}
      onContextMenu={(e) => {
        if (drag) e.preventDefault()
      }}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
      className={cn(
        'flex min-w-0 rounded-lg select-none [-webkit-touch-callout:none]',
        ctx && !empty && 'cursor-grab',
        className,
      )}
    >
      {children}
    </div>
  )
}
