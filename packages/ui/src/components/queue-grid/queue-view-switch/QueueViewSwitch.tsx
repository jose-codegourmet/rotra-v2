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
  /** Accessible name of the group: "Main Queue view" (default) or "Court layout" */
  label?: string
  /** Grid mode first, Slide mode second (the Courts layout); the Main Queue puts Slide first */
  gridFirst?: boolean
  /** The Slide icon: the Main Queue's one-card-with-neighbours `slide` (default) or the Courts' `list` */
  slideIcon?: 'slide' | 'list'
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
 * The view switch (prototype .qview): two icon segments, Slide mode and Grid mode, with tooltips and
 * screen-reader names. Built on SegmentedControl, so arrow keys move between them. The Main Queue uses
 * the defaults; the Courts header passes label "Court layout", gridFirst and slideIcon "list".
 */
export function QueueViewSwitch({
  value,
  onChange,
  label = 'Main Queue view',
  gridFirst = false,
  slideIcon = 'slide',
  className,
}: QueueViewSwitchProps) {
  const slide = {
    value: 'slide',
    label: slideIcon === 'list' ? <Icon name="list" /> : <SlideIcon />,
    iconOnly: true,
    ariaLabel: 'Slide mode',
  }
  const grid = {
    value: 'grid',
    label: <Icon name="grid" />,
    iconOnly: true,
    ariaLabel: 'Grid mode',
  }
  return (
    <SegmentedControl
      aria-label={label}
      value={value}
      onChange={(next) => onChange(next === 'grid' ? 'grid' : 'slide')}
      className={cn('self-center', className)}
      options={gridFirst ? [grid, slide] : [slide, grid]}
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
