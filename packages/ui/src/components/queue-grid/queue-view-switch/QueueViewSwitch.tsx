'use client'

import { cn } from '@rotra/ui/cn'
import { Icon } from '@rotra/ui/icon'
import { SegmentedControl } from '@rotra/ui/segmented-control'
import { useEffect, useState } from 'react'

/** How the Main Queue lays out the waiting matches. */
export type QueueViewMode = 'slide' | 'grid'

export type QueueViewSwitchProps = {
  value: QueueViewMode
  onChange: (mode: QueueViewMode) => void
  className?: string
}

/** The prototype's I.q_slide: one card with a sliver of its neighbours on each side. */
function SlideIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="6" y="5" width="12" height="14" rx="2" />
      <path d="M2 8v8M22 8v8" />
    </svg>
  )
}

/**
 * The Main Queue's view switch (prototype .qview): two icon segments, Slide mode and Grid mode, with
 * tooltips and screen-reader names. Built on SegmentedControl, so arrow keys move between them.
 */
export function QueueViewSwitch({ value, onChange, className }: QueueViewSwitchProps) {
  return (
    <SegmentedControl
      aria-label="Main Queue view"
      value={value}
      onChange={(next) => onChange(next === 'grid' ? 'grid' : 'slide')}
      className={cn('self-center', className)}
      options={[
        { value: 'slide', label: <SlideIcon />, iconOnly: true, ariaLabel: 'Slide mode' },
        { value: 'grid', label: <Icon name="grid" />, iconOnly: true, ariaLabel: 'Grid mode' },
      ]}
    />
  )
}

/** Where the view is kept on this device. */
export const QUEUE_VIEW_STORAGE_KEY = 'rotra.queue.view'

const isMode = (v: unknown): v is QueueViewMode => v === 'slide' || v === 'grid'

/**
 * The Main Queue's view, kept per device in localStorage. Slide on the server and first paint (so
 * markup matches), then the saved choice. Storage that throws or is blocked just means slide.
 */
export function useQueueViewMode(
  initial: QueueViewMode = 'slide',
  storageKey: string = QUEUE_VIEW_STORAGE_KEY,
) {
  const [mode, setMode] = useState<QueueViewMode>(initial)
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey)
      if (isMode(saved)) setMode(saved)
    } catch {
      // storage blocked: keep the default
    }
  }, [storageKey])
  const update = (next: QueueViewMode) => {
    setMode(next)
    try {
      window.localStorage.setItem(storageKey, next)
    } catch {
      // storage blocked or full: the choice lasts until reload
    }
  }
  return [mode, update] as const
}
