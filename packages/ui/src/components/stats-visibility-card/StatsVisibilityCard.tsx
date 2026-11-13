'use client'

import { Card } from '@rotra/ui/card'
import { cn } from '@rotra/ui/cn'
import { Notice } from '@rotra/ui/notice'
import { Switch } from '@rotra/ui/switch'
import { useEffect, useId, useRef, useState } from 'react'

/** Which switch: Show my profile stats or Show my weekly performance */
export type StatsVisibilityKey = 'stats' | 'weekly'

export type StatsVisibilityCardProps = {
  /** The confirmed Show my profile stats value (default on) */
  showProfileStats: boolean
  /** The confirmed Show my weekly performance value (default on) */
  showWeeklyPerformance: boolean
  /** The switch being saved: it is disabled and the saved line reads “Saving…” */
  pending?: StatsVisibilityKey | null
  error?: string
  /** The container saves it and shows the toast */
  onToggle: (key: StatsVisibilityKey, next: boolean) => void
  /**
   * Opened from the weekly chart's visibility chip: that row scrolls into view, is outlined in the
   * accent for about two seconds, and its switch takes focus.
   */
  highlight?: StatsVisibilityKey | null
}

const ROWS = [
  {
    key: 'stats',
    label: 'Show my profile stats',
    helper: 'Latest stats on your profile card: win rate, games, wins and losses this year.',
  },
  {
    key: 'weekly',
    label: 'Show my weekly performance',
    helper: 'The wins and losses by day of the week chart on your profile and your Games page.',
  },
] as const

/**
 * P-PROFILE-PRIVACY › Stats on your profile (2026-11-13-player-stats-visibility): two switches, both
 * on by default — Show my profile stats and Show my weekly performance. Off hides that item from
 * everyone else; the player still sees their own. Then the saved line. Built like
 * PlayerInformationCard.
 */
export function StatsVisibilityCard({
  showProfileStats,
  showWeeklyPerformance,
  pending,
  error,
  onToggle,
  highlight,
}: StatsVisibilityCardProps) {
  const baseId = useId()
  const rowRefs = useRef<Record<StatsVisibilityKey, HTMLDivElement | null>>({
    stats: null,
    weekly: null,
  })
  const switchRefs = useRef<Record<StatsVisibilityKey, HTMLButtonElement | null>>({
    stats: null,
    weekly: null,
  })
  const [flashing, setFlashing] = useState<StatsVisibilityKey | null>(null)
  useEffect(() => {
    if (!highlight) return
    const row = rowRefs.current[highlight]
    if (!row) return
    row.scrollIntoView({
      block: 'center',
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
    })
    switchRefs.current[highlight]?.focus({ preventScroll: true })
    setFlashing(highlight)
    const timer = setTimeout(() => setFlashing(null), 2200)
    return () => clearTimeout(timer)
  }, [highlight])
  const values: Record<StatsVisibilityKey, boolean> = {
    stats: showProfileStats,
    weekly: showWeeklyPerformance,
  }
  return (
    <Card asChild>
      <section className="flex flex-col gap-3">
        <h2>Stats on your profile</h2>
        <p className="m-0 text-sm text-fg2">
          Both are on unless you turn them off. Turning one off hides it from everyone else; you
          still see it on your own profile.
        </p>
        {ROWS.map((row) => {
          const id = `${baseId}-${row.key}`
          return (
            <div
              key={row.key}
              ref={(node) => {
                rowRefs.current[row.key] = node
              }}
              className={cn(
                'flex items-start justify-between gap-4 rounded-md',
                flashing === row.key && 'animate-setting-flash motion-reduce:animate-none',
              )}
            >
              <div className="flex min-w-0 flex-col gap-1">
                <label htmlFor={id} className="font-bold">
                  {row.label}
                </label>
                <p className="m-0 text-sm text-fg2">{row.helper}</p>
              </div>
              <Switch
                id={id}
                ref={(node) => {
                  switchRefs.current[row.key] = node
                }}
                aria-label={row.label}
                checked={values[row.key]}
                disabled={!!pending}
                aria-busy={pending === row.key || undefined}
                onChange={(next) => onToggle(row.key, next)}
              />
            </div>
          )
        })}
        <p className="m-0 text-sm" aria-live="polite">
          {pending
            ? 'Saving…'
            : `Saved: profile stats ${showProfileStats ? 'shown' : 'hidden'}, weekly performance ${showWeeklyPerformance ? 'shown' : 'hidden'}.`}
        </p>
        {error ? <Notice tone="error">{error}</Notice> : null}
      </section>
    </Card>
  )
}
