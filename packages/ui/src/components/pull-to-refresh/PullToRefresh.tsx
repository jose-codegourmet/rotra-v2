'use client'
import { cn } from '@rotra/ui/cn'
import { type ReactNode, useEffect, useRef, useState } from 'react'

export type PullToRefreshProps = {
  /** Refetches the page's data only; the lock and offline state come from the caller */
  onRefresh: () => Promise<unknown> | undefined
  /** Refresh ran less than 10 s ago: a full pull says "Refresh again in a few seconds" */
  throttled?: boolean
  /** The viewer is offline: a full pull says "You're offline. Reconnect and try again." */
  offline?: boolean
  /** The refresh is still running (keeps the spinner while the caller's refetch settles) */
  refreshing?: boolean
  /** Time of the data now on screen, already formatted: "7:42 PM". Shown as "Updated 7:42 PM" after a pull. */
  updatedLabel?: string
  /** Gestures are ignored while true, e.g. while a sheet is open */
  disabled?: boolean
  children: ReactNode
  className?: string
}

type Phase = 'idle' | 'pulling' | 'armed' | 'busy' | 'done' | 'wait' | 'off'

/** Pull distance (in page px × 0.55) that arms the release */
export const PULL_ARM_PX = 64
const PULL_MAX_PX = 96
const COPY: Record<Exclude<Phase, 'idle' | 'done'>, string> = {
  pulling: 'Pull to refresh',
  armed: 'Release to refresh',
  busy: 'Refreshing…',
  wait: 'Refresh again in a few seconds',
  off: "You're offline. Reconnect and try again.",
}

/**
 * The prototypes' #ptr: pulling the page down from its top slides a pill from under the top bar
 * ("Pull to refresh" → "Release to refresh"); releasing past the arm point runs `onRefresh` and
 * the pill reads "Refreshing…", then "Updated 7:42 PM" for a moment. Touch only, from scroll
 * position 0; only the data refreshes, never the page (D-2026-11-09-04). While `throttled` or
 * `offline`, a full pull shows why nothing happened. Reduced motion keeps the pill, slows the ring.
 */
export function PullToRefresh({
  onRefresh,
  throttled = false,
  offline = false,
  refreshing = false,
  updatedLabel,
  disabled = false,
  children,
  className,
}: PullToRefreshProps) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [dist, setDist] = useState(0)
  // The pill rests just under the sticky top bar (<header>); hidden, it sits behind it.
  const [top, setTop] = useState(64)
  const touch = useRef<{ y0: number; dist: number } | null>(null)
  const latest = useRef({ onRefresh, throttled, offline, disabled, updatedLabel })
  latest.current = { onRefresh, throttled, offline, disabled, updatedLabel }
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Native pull-to-reload would fight the gesture; keep the page's overscroll on the page.
  useEffect(() => {
    const html = document.documentElement
    const before = html.style.overscrollBehaviorY
    html.style.overscrollBehaviorY = 'contain'
    return () => {
      html.style.overscrollBehaviorY = before
    }
  }, [])

  useEffect(() => {
    const blocked = (): Phase | null =>
      latest.current.offline ? 'off' : latest.current.throttled ? 'wait' : null
    const hide = (after = 0) => {
      if (hideTimer.current) clearTimeout(hideTimer.current)
      hideTimer.current = setTimeout(() => {
        setPhase('idle')
        setDist(0)
      }, after)
    }
    const run = async () => {
      setPhase('busy')
      setDist(0)
      try {
        await latest.current.onRefresh()
      } finally {
        setPhase('done')
        hide(1400)
      }
    }
    const onStart = (e: TouchEvent) => {
      touch.current = null
      if (latest.current.disabled || e.touches.length > 1 || window.scrollY > 0) return
      const first = e.touches[0]
      if (!first) return
      // Not from inside an open sheet or dialog (Radix locks the body scroll while one is open).
      const target = e.target instanceof Element ? e.target : null
      if (target?.closest('[role="dialog"]') || document.body.hasAttribute('data-scroll-locked'))
        return
      touch.current = { y0: first.clientY, dist: 0 }
      const bar = document.querySelector('header')
      setTop(Math.round(bar ? bar.getBoundingClientRect().bottom : 56) + 8)
    }
    const onMove = (e: TouchEvent) => {
      const t = touch.current
      const first = e.touches[0]
      if (!t || !first) return
      const dy = first.clientY - t.y0
      if (dy <= 0 && !t.dist) {
        touch.current = null
        return
      }
      if (window.scrollY > 0) {
        touch.current = null
        hide()
        return
      }
      if (e.cancelable) e.preventDefault()
      t.dist = Math.max(0, dy * 0.55)
      if (hideTimer.current) clearTimeout(hideTimer.current)
      setDist(t.dist)
      setPhase(blocked() ?? (t.dist >= PULL_ARM_PX ? 'armed' : 'pulling'))
    }
    const onEnd = () => {
      const t = touch.current
      touch.current = null
      if (!t?.dist) return
      if (t.dist < PULL_ARM_PX) return hide()
      const why = blocked()
      if (why) {
        setPhase(why)
        setDist(0)
        return hide(1600)
      }
      void run()
    }
    const onCancel = () => {
      touch.current = null
      hide()
    }
    document.addEventListener('touchstart', onStart, { passive: true })
    document.addEventListener('touchmove', onMove, { passive: false })
    document.addEventListener('touchend', onEnd)
    document.addEventListener('touchcancel', onCancel)
    return () => {
      document.removeEventListener('touchstart', onStart)
      document.removeEventListener('touchmove', onMove)
      document.removeEventListener('touchend', onEnd)
      document.removeEventListener('touchcancel', onCancel)
      if (hideTimer.current) clearTimeout(hideTimer.current)
    }
  }, [])

  const pulling = phase === 'pulling' || phase === 'armed' || phase === 'wait' || phase === 'off'
  const shown = phase !== 'idle'
  const busy = phase === 'busy' || (phase === 'done' && refreshing)
  const text =
    phase === 'done'
      ? updatedLabel
        ? `Updated ${updatedLabel}`
        : 'Updated'
      : phase === 'idle'
        ? ''
        : COPY[phase]
  // While pulling the pill follows the finger from above the bar; otherwise it rests under it.
  const offset = pulling && dist > 0 ? Math.min(dist, PULL_MAX_PX) - PULL_MAX_PX : 0

  return (
    <div className={cn('contents', className)}>
      <div
        role="status"
        aria-live="polite"
        className={cn(
          'pointer-events-none fixed left-1/2 z-[19] inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-border bg-surface py-1.5 pr-3 pl-2.5 text-[13px] font-semibold text-fg2 shadow-card',
          'transition-[opacity,transform] duration-150 motion-reduce:transition-none',
          pulling && dist > 0 && 'transition-none',
          shown ? 'opacity-100' : 'opacity-0',
          phase === 'done' && 'text-accent',
        )}
        style={{
          top,
          transform: shown ? `translate(-50%, ${offset}px)` : 'translate(-50%, -140%)',
        }}
      >
        <span
          aria-hidden
          className={cn(
            'inline-block size-3.5 rounded-full border-2 border-border-strong border-t-accent transition-transform duration-150',
            phase === 'armed' && 'rotate-180',
            busy && 'animate-spin motion-reduce:[animation-duration:3s]',
            phase === 'done' && 'border-accent',
            (phase === 'wait' || phase === 'off') && 'border-t-border-strong',
          )}
        />
        <span>{text}</span>
      </div>
      {children}
    </div>
  )
}
