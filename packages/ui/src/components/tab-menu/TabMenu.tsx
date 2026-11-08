'use client'

import { cn } from '@rotra/ui/cn'
import { Icon } from '@rotra/ui/icon'
import type { TabBadge, TabItem } from '@rotra/ui/tabs'
import { DropdownMenu } from 'radix-ui'

export type TabMenuProps = {
  items: TabItem[]
  value: string
  onChange: (value: string) => void
  'aria-label': string
  className?: string
}

function Badges({ badges }: { badges?: TabBadge[] }) {
  return badges?.map((badge) => (
    <span
      key={badge.text + (badge.longText ?? '')}
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold whitespace-nowrap',
        badge.tone === 'warn'
          ? 'border-warn/45 bg-warn-subtle text-warn'
          : badge.tone === 'error'
            ? 'border-error/45 bg-error-subtle text-error'
            : 'border-border-strong text-fg2',
      )}
    >
      {badge.text}
      {badge.longText}
    </span>
  ))
}

/** A full-width menu for choosing a tab on a phone. */
export function TabMenu({ items, value, onChange, className, ...aria }: TabMenuProps) {
  const current = items.find((item) => item.value === value) ?? items[0]
  if (!current) return null

  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger
        aria-label={`${aria['aria-label']}: ${current.label}`}
        className={cn(
          'flex min-h-11 w-full items-center justify-between gap-2 rounded border border-border-strong bg-surface px-3.5 py-2 text-left font-bold text-fg',
          'outline-none focus-visible:ring-2 focus-visible:ring-accent',
          '[&[data-state=open]>svg]:rotate-180',
          className,
        )}
      >
        <span className="inline-flex min-w-0 items-center gap-2">
          <span>{current.label}</span>
          <Badges badges={current.badges} />
        </span>
        <Icon name="down" className="shrink-0 text-fg2" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          loop
          aria-label={aria['aria-label']}
          align="start"
          sideOffset={4}
          collisionPadding={16}
          className="z-50 flex max-h-(--radix-dropdown-menu-content-available-height) w-(--radix-dropdown-menu-trigger-width) flex-col gap-0.5 overflow-y-auto rounded-sm border border-border-strong bg-elev p-1.5 shadow-pop"
        >
          <DropdownMenu.RadioGroup value={value} onValueChange={onChange}>
            {items.map((item) => (
              <DropdownMenu.RadioItem
                key={item.value}
                value={item.value}
                disabled={item.disabled}
                className={cn(
                  'flex min-h-11 cursor-pointer items-center justify-between gap-2 rounded-sm px-3 py-2 text-left text-sm font-semibold text-fg outline-none',
                  'data-highlighted:bg-accent-subtle data-disabled:cursor-not-allowed data-disabled:text-fg3',
                  'data-[state=checked]:text-accent',
                )}
              >
                <span className="inline-flex min-w-0 items-center gap-2">
                  <span>{item.label}</span>
                  <Badges badges={item.badges} />
                </span>
                <DropdownMenu.ItemIndicator>
                  <Icon name="check" />
                </DropdownMenu.ItemIndicator>
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
