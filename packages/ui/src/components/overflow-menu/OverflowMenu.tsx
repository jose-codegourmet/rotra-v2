'use client'

import { cn } from '@rotra/ui/cn'
import { Icon, type IconName } from '@rotra/ui/icon'
import { IconButton } from '@rotra/ui/icon-button'
import { DropdownMenu } from 'radix-ui'

export type OverflowMenuItem = {
  label: string
  onSelect: () => void
  /** Disables the item and shows this short reason under its label */
  disabledReason?: string
  /** What the item does, under its label while it is enabled */
  description?: string
  /** Error colour for a removal */
  destructive?: boolean
  /** A leading icon; the row is then one line, icon then label (the preparation header's ⋯) */
  icon?: IconName
}

export type OverflowMenuProps = {
  /** The trigger's accessible name, e.g. "More for Court 4" */
  label: string
  items: OverflowMenuItem[]
  /** Which edge of the trigger the list lines up with: `end` (default) for a menu at a card's right, `start` beside a left-aligned button */
  align?: 'start' | 'end'
  /** The trigger's size: `xs` (default) on cards, `sm` beside a page title */
  triggerSize?: 'xs' | 'sm'
  className?: string
}

/**
 * The prototypes' ⋯ menu (.cmenu): a small icon button that opens a list of secondary actions under
 * it. Opening focuses the first enabled item; ↑ / ↓ move between items; Escape or a click outside
 * closes it and returns focus to the trigger. A portal prevents clipping by tables/cards;
 * collision handling and bounded scrolling keep the menu inside the viewport.
 */
export function OverflowMenu({
  label,
  items,
  align = 'end',
  triggerSize = 'xs',
  className,
}: OverflowMenuProps) {
  return (
    <DropdownMenu.Root modal={false}>
      <div className={cn('relative', className)}>
        <DropdownMenu.Trigger asChild>
          <IconButton size={triggerSize} variant="ghost" label={label}>
            <Icon name="more" />
          </IconButton>
        </DropdownMenu.Trigger>
      </div>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          loop
          onFocus={(event) => {
            if (event.target !== event.currentTarget) return
            const first = event.currentTarget.querySelector<HTMLElement>(
              '[role="menuitem"]:not([data-disabled])',
            )
            first?.focus()
          }}
          aria-label={label}
          align={align}
          sideOffset={4}
          collisionPadding={16}
          className="z-50 flex max-h-(--radix-dropdown-menu-content-available-height) min-w-[200px] max-w-[min(320px,calc(100vw-32px))] flex-col gap-0.5 overflow-y-auto rounded-sm border border-border-strong bg-elev p-1.5 shadow-pop"
        >
          {items.map((item) => (
            <DropdownMenu.Item
              asChild
              key={item.label}
              disabled={!!item.disabledReason}
              onSelect={item.onSelect}
              className={cn(
                'flex min-h-11 cursor-pointer rounded-sm px-3 py-2 text-left text-sm outline-none',
                item.icon
                  ? 'flex-row items-center gap-3 font-semibold'
                  : 'flex-col items-start gap-0.5',
                'data-highlighted:bg-accent-subtle',
                'data-disabled:cursor-not-allowed data-disabled:text-fg3',
                item.destructive && !item.disabledReason ? 'text-error' : 'text-fg',
              )}
            >
              <button type="button" disabled={!!item.disabledReason}>
                {item.icon ? <Icon name={item.icon} className="shrink-0" /> : null}
                <span>{item.label}</span>
                {item.disabledReason || item.description ? (
                  <span className="text-xs text-fg2">
                    {item.disabledReason || item.description}
                  </span>
                ) : null}
              </button>
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
