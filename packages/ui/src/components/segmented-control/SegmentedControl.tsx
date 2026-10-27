'use client'

import { cn } from '@rotra/ui/cn'
import { ToggleGroup } from 'radix-ui'
import type { ReactNode } from 'react'

export type SegmentedOption = {
  value: string
  label: ReactNode
  /** Muted number after the label (admin filters: "Pending 3") */
  count?: number
  disabled?: boolean
}

export type SegmentedControlProps = {
  options: SegmentedOption[]
  value: string
  onChange: (value: string) => void
  /** Names the group, e.g. "Show" or "Payment per player" */
  'aria-label': string
  disabled?: boolean
  className?: string
}

/**
 * The prototypes' .seg: a small pill row where exactly one option is on (filters, payment mode).
 * Arrow keys move between options. 44 px tall on touch screens.
 */
export function SegmentedControl({
  options,
  value,
  onChange,
  disabled,
  className,
  ...aria
}: SegmentedControlProps) {
  return (
    <ToggleGroup.Root
      type="single"
      value={value}
      // Radix lets a second tap clear a single group; a segmented control always keeps one option on.
      onValueChange={(next) => {
        if (next) onChange(next)
      }}
      disabled={disabled}
      aria-label={aria['aria-label']}
      className={cn(
        'inline-flex flex-wrap gap-[3px] self-start rounded-lg border border-border-strong p-[3px]',
        className,
      )}
    >
      {options.map((option) => (
        <ToggleGroup.Item
          key={option.value}
          value={option.value}
          disabled={option.disabled}
          className={cn(
            'inline-flex min-h-9 items-center gap-1.5 rounded-[7px] border-0 bg-transparent px-3.5 font-semibold text-fg2',
            'data-[state=on]:bg-elev data-[state=on]:text-fg disabled:cursor-not-allowed disabled:opacity-45',
            'touch:min-h-11 touch:px-4',
          )}
        >
          {option.label}
          {option.count !== undefined ? (
            <span className="text-xs text-fg3 tabular-nums">{option.count}</span>
          ) : null}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  )
}
