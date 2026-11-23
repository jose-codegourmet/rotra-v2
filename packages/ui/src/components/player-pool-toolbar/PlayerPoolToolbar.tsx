'use client'

import { cn } from '@rotra/ui/cn'
import { SegmentedControl } from '@rotra/ui/segmented-control'
import { Select } from '@rotra/ui/select'

/**
 * Which players the grid shows: present and off court, present, away (Not here), the waitlist
 * panel instead of cards, or the whole roster
 */
export type PlayerPoolShow = 'available' | 'present' | 'away' | 'waitlist' | 'everyone'
export type PlayerPoolSort = 'wait' | 'least' | 'most' | 'level'

export type PlayerPoolToolbarProps = {
  show: PlayerPoolShow
  onShowChange: (show: PlayerPoolShow) => void
  /** Live counts for the five filters */
  counts: { available: number; present: number; away: number; waitlist: number; everyone: number }
  sort: PlayerPoolSort
  onSortChange: (sort: PlayerPoolSort) => void
  className?: string
}

export const PLAYER_POOL_SORT_LABELS: Record<PlayerPoolSort, string> = {
  wait: 'Sort: longest wait',
  least: 'Sort: least games',
  most: 'Sort: most games',
  level: 'Sort: level, high to low',
}

const SORT_OPTIONS = (Object.keys(PLAYER_POOL_SORT_LABELS) as PlayerPoolSort[]).map((value) => ({
  value,
  label: PLAYER_POOL_SORT_LABELS[value],
}))

/**
 * The Players view filter and sort row (the prototype's .seg + #pl-sort): Available · N (default),
 * Present · N, Not here · N, Waitlist · N, Everyone · N, and the "Sort players" select (hidden
 * while Waitlist is shown).
 */
export function PlayerPoolToolbar({
  show,
  onShowChange,
  counts,
  sort,
  onSortChange,
  className,
}: PlayerPoolToolbarProps) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2.5', className)}>
      <SegmentedControl
        aria-label="Show"
        value={show}
        onChange={(value) => onShowChange(value as PlayerPoolShow)}
        options={[
          { value: 'available', label: `Available · ${counts.available}` },
          { value: 'present', label: `Present · ${counts.present}` },
          { value: 'away', label: `Not here · ${counts.away}` },
          { value: 'waitlist', label: `Waitlist · ${counts.waitlist}` },
          { value: 'everyone', label: `Everyone · ${counts.everyone}` },
        ]}
      />
      {show === 'waitlist' ? null : (
        <Select
          aria-label="Sort players"
          value={sort}
          onChange={(value) => onSortChange(value as PlayerPoolSort)}
          options={SORT_OPTIONS}
          className="w-auto min-h-[42px]"
        />
      )}
    </div>
  )
}
