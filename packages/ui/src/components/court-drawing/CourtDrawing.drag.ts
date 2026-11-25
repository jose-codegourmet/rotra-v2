'use client'

import { type PointerEvent as ReactPointerEvent, type RefObject, useEffect, useRef } from 'react'

/**
 * The attribute a free open court carries so a dragged drawing can land on it. Its value is the
 * court's id, handed back to `onDragMove`. Set it through CourtCard's `dropCourtId`.
 */
export const COURT_DROP_ATTRIBUTE = 'data-free-court'
/** Set on a drop target while the dragged drawing is over it (CourtCard styles it solid with a tint) */
export const COURT_OVER_ATTRIBUTE = 'data-court-drop'
/**
 * Set on the body for the whole drag (CourtCard shows every drop target's dashed outline; the card
 * being dragged marks itself `data-court-source` and shows none)
 */
export const COURT_DRAGGING_ATTRIBUTE = 'data-court-dragging'
/** Set on the dragged drawing's own court card while it is a drop target too (a busy court) */
export const COURT_SOURCE_ATTRIBUTE = 'data-court-source'

// The same ghost the swap drag uses (SwappablePlayer's .swap-ghost), as the mockup log asks.
const GHOST_CLASSES = [
  'fixed',
  'z-[1000]',
  'm-0',
  'pointer-events-none',
  'opacity-[0.94]',
  'rounded-lg',
  'shadow-pop',
]
const GHOST_LIFT_CLASSES = ['transition-[scale]', 'duration-150', 'ease-out']
const GHOST_LIFTED_CLASS = 'scale-105'
const BODY_CLASSES = ['cursor-grabbing', '[&_*]:cursor-grabbing!']

const MOUSE_START_PX = 6
const TOUCH_SCROLL_PX = 8
const TOUCH_HOLD_MS = 300

type Drag = {
  source: HTMLElement
  onDrop: (courtId: string) => void
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

function lift(d: Drag) {
  const rect = d.source.getBoundingClientRect()
  const ghost = d.source.cloneNode(true) as HTMLElement
  ghost.removeAttribute('id')
  ghost.removeAttribute('title')
  ghost.removeAttribute('role')
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
  d.source.closest(`[${COURT_DROP_ATTRIBUTE}]`)?.setAttribute(COURT_SOURCE_ATTRIBUTE, '')
  document.body.setAttribute(COURT_DRAGGING_ATTRIBUTE, '')
  document.body.classList.add(...BODY_CLASSES)
  if (d.touch && typeof navigator.vibrate === 'function') navigator.vibrate(10)
}

function move(d: Drag, x: number, y: number) {
  if (!d.ghost) return
  d.ghost.style.transform = `translate(${x - d.x}px, ${y - d.y}px)`
  const hit = document.elementFromPoint(x, y)
  const found =
    hit instanceof Element ? hit.closest<HTMLElement>(`[${COURT_DROP_ATTRIBUTE}]`) : null
  // A busy court carries the attribute too (trade courts); its own drawing never lands on it.
  const target = found?.contains(d.source) ? null : found
  if (d.over && d.over !== target) d.over.removeAttribute(COURT_OVER_ATTRIBUTE)
  d.over = target
  if (target) target.setAttribute(COURT_OVER_ATTRIBUTE, '')
}

// The click that ends a drag must not open the match or a profile.
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
  document.body.removeAttribute(COURT_DRAGGING_ATTRIBUTE)
  document.body.classList.remove(...BODY_CLASSES)
  d.over?.removeAttribute(COURT_OVER_ATTRIBUTE)
  d.source.closest(`[${COURT_DROP_ATTRIBUTE}]`)?.removeAttribute(COURT_SOURCE_ATTRIBUTE)
  swallowNextClick()
  const courtId = d.over?.getAttribute(COURT_DROP_ATTRIBUTE)
  if (apply && courtId) d.onDrop(courtId)
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
 * Makes a court drawing draggable (the mockup's cdrag): mouse or pen after 6 px, touch after a press
 * and hold (a quick swipe still scrolls). A copy follows the pointer; free courts carrying
 * `data-free-court` show a dashed outline and the one under the pointer a solid one. Dropping on one
 * calls `onDrop(courtId)`; dropping anywhere else does nothing. The
 * click that ends a drag is swallowed, so a tap without dragging is the only click that opens the match.
 */
export function useCourtDrag<T extends HTMLElement>(
  ref: RefObject<T | null>,
  onDrop: ((courtId: string) => void) | undefined,
) {
  const onDropRef = useRef(onDrop)
  onDropRef.current = onDrop
  const enabled = !!onDrop

  // React registers touch listeners as passive, so the hold-to-lift path attaches its own.
  useEffect(() => {
    const element = ref.current
    if (!enabled || !element) return
    const onTouchStart = (e: TouchEvent) => {
      if (drag || e.touches.length > 1) return
      const p = e.touches[0]
      if (!p) return
      startTouch({
        source: element,
        onDrop: (id) => onDropRef.current?.(id),
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
  }, [enabled, ref])

  const onPointerDown = (e: ReactPointerEvent<T>) => {
    if (!enabled || drag || e.pointerType === 'touch' || e.button !== 0) return
    const element = ref.current
    if (!element) return
    startPointer({
      source: element,
      onDrop: (id) => onDropRef.current?.(id),
      x: e.clientX,
      y: e.clientY,
      on: false,
      touch: false,
      ghost: null,
      over: null,
      timer: null,
    })
  }

  return { onPointerDown }
}
