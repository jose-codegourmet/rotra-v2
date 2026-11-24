'use client'

import { cn } from '@rotra/ui/cn'
import { tabFocusClass } from '@rotra/ui/tabs'

export type CountPillItem = {
  value: string
  label: string
  /** Shown in the round badge on the right; 0 still shows */
  count: number
}

export type CountPillsProps = {
  items: CountPillItem[]
  value: string
  onChange: (value: string) => void
  /** Names the group, e.g. "Court" */
  'aria-label': string
  className?: string
}

/**
 * The prototype's .cfilter: separate rounded pills, each with a label and a small round count
 * badge. The picked pill is solid accent (badge a lighter tint); the rest are outlined and
 * brighten on hover. Wraps onto a second line on narrow screens.
 */
export function CountPills({ items, value, onChange, className, ...aria }: CountPillsProps) {
  return (
    // biome-ignore lint/a11y/useSemanticElements: a group div; a fieldset would change the drawn layout
    <div
      role="group"
      aria-label={aria['aria-label']}
      className={cn('flex flex-wrap gap-2', className)}
    >
      {items.map((item) => {
        const picked = item.value === value
        return (
          <button
            key={item.value}
            type="button"
            aria-pressed={picked}
            onClick={() => onChange(item.value)}
            className={cn(
              'inline-flex h-9 cursor-pointer items-center gap-2 rounded-full border py-0 pr-1.5 pl-3.5 font-semibold text-sm',
              'touch:h-11',
              picked
                ? 'border-accent bg-accent text-on-accent'
                : 'border-border-strong bg-surface text-fg2 hover:border-fg3 hover:text-fg',
              tabFocusClass,
            )}
          >
            <span>{item.label}</span>
            <span
              className={cn(
                'grid h-6 min-w-6 place-items-center rounded-full px-[7px] font-bold text-xs tabular-nums',
                picked
                  ? 'bg-[color-mix(in_srgb,var(--on-accent)_18%,transparent)] text-on-accent'
                  : 'bg-bg text-fg2',
              )}
            >
              {item.count}
            </span>
          </button>
        )
      })}
    </div>
  )
}
