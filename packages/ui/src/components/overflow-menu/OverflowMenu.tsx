'use client'

import { cn } from '@rotra/ui/cn'
import { Icon } from '@rotra/ui/icon'
import { IconButton } from '@rotra/ui/icon-button'
import { type KeyboardEvent, useEffect, useId, useRef, useState } from 'react'

export type OverflowMenuItem = {
  label: string
  onSelect: () => void
  /** Disables the item and shows this short reason under its label */
  disabledReason?: string
  /** What the item does, under its label while it is enabled */
  description?: string
  /** Error colour for a removal */
  destructive?: boolean
}

export type OverflowMenuProps = {
  /** The trigger's accessible name, e.g. "More for Court 4" */
  label: string
  items: OverflowMenuItem[]
  /** Which edge of the trigger the list lines up with: `end` (default) for a menu at a card's right, `start` beside a left-aligned button */
  align?: 'start' | 'end'
  className?: string
}

/**
 * The prototypes' ⋯ menu (.cmenu): a small icon button that opens a list of secondary actions under
 * it. Opening focuses the first enabled item; ↑ / ↓ move between items; Escape or a click outside
 * closes it and returns focus to the trigger. Choosing an item closes the menu first.
 */
export function OverflowMenu({ label, items, align = 'end', className }: OverflowMenuProps) {
  const [open, setOpen] = useState(false)
  const menuId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    listRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')?.focus()
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    return () => document.removeEventListener('pointerdown', onPointer)
  }, [open])

  const close = () => {
    setOpen(false)
    triggerRef.current?.focus()
  }
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      close()
      return
    }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    e.preventDefault()
    const enabled = Array.from(
      listRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)') ??
        [],
    )
    const at = enabled.indexOf(document.activeElement as HTMLButtonElement)
    const next = (at + (e.key === 'ArrowDown' ? 1 : -1) + enabled.length) % enabled.length
    enabled[next]?.focus()
  }

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <IconButton
        ref={triggerRef}
        size="xs"
        variant="ghost"
        label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name="more" />
      </IconButton>
      {open ? (
        <div
          ref={listRef}
          id={menuId}
          role="menu"
          aria-label={label}
          tabIndex={-1}
          onKeyDown={onKeyDown}
          className={cn(
            'absolute top-[calc(100%+4px)] z-20 flex min-w-[200px] flex-col gap-0.5 rounded-sm border border-border-strong bg-elev p-1.5 shadow-pop',
            align === 'end' ? 'right-0' : 'left-0 max-w-[min(320px,calc(100vw-32px))]',
          )}
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              disabled={!!item.disabledReason}
              onClick={() => {
                close()
                item.onSelect()
              }}
              className={cn(
                'flex min-h-11 cursor-pointer flex-col items-start gap-0.5 rounded-sm px-3 py-2 text-left text-sm',
                'hover:bg-accent-subtle focus-visible:bg-accent-subtle focus-visible:outline-none',
                'disabled:cursor-not-allowed disabled:text-fg3 disabled:hover:bg-transparent',
                item.destructive && !item.disabledReason ? 'text-error' : 'text-fg',
              )}
            >
              <span>{item.label}</span>
              {item.disabledReason || item.description ? (
                <span className="text-xs text-fg2">{item.disabledReason || item.description}</span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
