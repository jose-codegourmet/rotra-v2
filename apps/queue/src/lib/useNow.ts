'use client'

import { useEffect, useState } from 'react'

/** The console's refresh cadence from the prototype: a render every 30 s */
export const CONSOLE_REFRESH_MS = 30_000

const FIELD_TAGS = /^(INPUT|SELECT|TEXTAREA)$/

/** A field has focus (typing in a sheet or the pool filter), so a refresh would disturb it */
function fieldHasFocus() {
  const el = document.activeElement
  return !!el && (FIELD_TAGS.test(el.tagName) || (el as HTMLElement).isContentEditable)
}

/** A sheet or dialog is open (Radix renders role="dialog" only while open) */
function sheetIsOpen() {
  return document.querySelector('[role="dialog"]') !== null
}

/**
 * The time the live console renders against, re-read every `intervalMs` so wait times, minutes in
 * game and Booking ended move on their own. A tick is skipped, as in the prototype's refresh timer,
 * while a sheet is open, a field has focus, or a pointer is held down (a queue card being dragged);
 * the next tick after the work ends catches up. Pass `paused` for work the DOM cannot show.
 */
export function useNow(intervalMs = CONSOLE_REFRESH_MS, paused = false): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    let pointerDown = false
    const down = () => {
      pointerDown = true
    }
    const up = () => {
      pointerDown = false
    }
    document.addEventListener('pointerdown', down)
    document.addEventListener('pointerup', up)
    document.addEventListener('pointercancel', up)
    const timer = window.setInterval(() => {
      if (paused || pointerDown || sheetIsOpen() || fieldHasFocus()) return
      setNow(Date.now())
    }, intervalMs)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('pointerdown', down)
      document.removeEventListener('pointerup', up)
      document.removeEventListener('pointercancel', up)
    }
  }, [intervalMs, paused])
  return now
}
