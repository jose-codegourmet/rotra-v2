'use client'
import { Chip } from '@rotra/ui/chip'
import { cn } from '@rotra/ui/cn'
import { type KeyboardEvent, useRef } from 'react'

export type SectionNavItem = {
  id: string
  label: string
  /** Fields to fix in this section; shown instead of the unsaved dot */
  errorCount: number
  dirty: boolean
}
export type SectionNavProps = {
  items: SectionNavItem[]
  selectedId: string
  onSelect: (id: string) => void
  /** id of the tabpanel the tabs control */
  panelId: string
  /** Prefix for each tab's id, so the panel can be labelled by the selected tab */
  tabIdPrefix: string
}
/** Edit profile's section menu: a sticky left column on wide screens, tabs across the top on phones. */
export function SectionNav({ items, selectedId, onSelect, panelId, tabIdPrefix }: SectionNavProps) {
  const tabs = useRef<(HTMLButtonElement | null)[]>([])
  const move = (event: KeyboardEvent, index: number) => {
    const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[event.key]
    const target =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? items.length - 1
          : step === undefined
            ? null
            : (index + step + items.length) % items.length
    const item = target === null ? undefined : items[target]
    if (target === null || !item) return
    event.preventDefault()
    onSelect(item.id)
    tabs.current[target]?.focus()
  }
  return (
    <div
      role="tablist"
      aria-label="Profile sections"
      className={cn(
        'flex flex-col gap-0.5 min-[721px]:sticky min-[721px]:top-[calc(73px+16px+env(safe-area-inset-top,0px))]',
        'max-[720px]:flex-row max-[720px]:gap-1 max-[720px]:overflow-x-auto max-[720px]:border-b max-[720px]:border-border',
      )}
    >
      {items.map((item, index) => {
        const selected = item.id === selectedId
        return (
          <button
            key={item.id}
            ref={(element) => {
              tabs.current[index] = element
            }}
            type="button"
            role="tab"
            id={`${tabIdPrefix}-${item.id}`}
            aria-selected={selected}
            aria-controls={panelId}
            tabIndex={selected ? 0 : -1}
            onClick={() => onSelect(item.id)}
            onKeyDown={(event) => move(event, index)}
            className={cn(
              'flex min-h-[42px] cursor-pointer items-center justify-between gap-2 rounded-md border-0 bg-transparent px-3 text-left font-semibold text-fg2 touch:min-h-11',
              'hover:bg-surface hover:text-fg',
              selected && 'bg-elev text-fg shadow-[inset_2px_0_0_var(--accent)]',
              'max-[720px]:min-h-11 max-[720px]:flex-none max-[720px]:rounded-none max-[720px]:shadow-none',
              selected &&
                'max-[720px]:bg-transparent max-[720px]:shadow-[inset_0_-2px_0_var(--accent)]',
            )}
          >
            <span>{item.label}</span>
            {item.errorCount ? (
              <Chip tone="error" aria-label={`${item.errorCount} to fix`}>
                {item.errorCount}
              </Chip>
            ) : item.dirty ? (
              <i
                role="img"
                aria-label="Unsaved changes"
                title="Unsaved changes"
                className="size-2 flex-none rounded-full bg-accent"
              />
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
