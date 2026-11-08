'use client'

import { SegmentedControl } from '@rotra/ui/segmented-control'

export type CompareFilter = 'all' | 'h2h' | 'together'
export type CompareFilterBarProps = {
  value: CompareFilter
  counts: Record<CompareFilter, number>
  onChange: (filter: CompareFilter) => void
  className?: string
}

/** P-COMPARE's counted-game filter; the container resets paging when this changes. */
export function CompareFilterBar({ value, counts, onChange, className }: CompareFilterBarProps) {
  return (
    <SegmentedControl
      aria-label="Show games"
      value={value}
      onChange={(next) => {
        if (next === 'all' || next === 'h2h' || next === 'together') onChange(next)
      }}
      options={[
        { value: 'all', label: `All · ${counts.all}` },
        { value: 'h2h', label: `Head to head · ${counts.h2h}` },
        { value: 'together', label: `Together · ${counts.together}` },
      ]}
      className={className}
    />
  )
}
