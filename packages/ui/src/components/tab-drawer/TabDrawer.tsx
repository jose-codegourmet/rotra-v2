'use client'

import { cn } from '@rotra/ui/cn'
import { Icon } from '@rotra/ui/icon'
import { IconButton } from '@rotra/ui/icon-button'
import type { TabBadge, TabItem } from '@rotra/ui/tabs'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Dialog } from 'radix-ui'
import { useId, useState } from 'react'

export type TabDrawerProps = {
  items: TabItem[]
  value: string
  onChange: (value: string) => void
  /** Names the view list ("Console views"); the button reads "<label>: <current>. Open the views menu" */
  'aria-label': string
  /** The drawer's heading, e.g. "Live session" */
  title: string
  /** The button's label before the current view ("Console view"); defaults to aria-label */
  menuLabel?: string
  className?: string
}

function Chip({ badge }: { badge?: TabBadge }) {
  if (!badge) return null
  return (
    <span
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
    </span>
  )
}

const EASE_OUT = [0, 0, 0.58, 1] as const

/**
 * The live console's phone view picker (the prototype's consoleViewDrawer): a full-width button
 * showing the current view and its first chip, which opens a left drawer over a scrim listing every
 * view with its chip. Picking one switches the view and closes it; Escape, the scrim and × close
 * it and focus returns to the button. Render it only at phone width (Tabs does, at 640 px and below).
 */
export function TabDrawer({
  items,
  value,
  onChange,
  title,
  menuLabel,
  className,
  ...aria
}: TabDrawerProps) {
  const [open, setOpen] = useState(false)
  const reduced = useReducedMotion()
  const drawerId = useId()
  const current = items.find((item) => item.value === value) ?? items[0]
  if (!current) return null

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger
        aria-controls={drawerId}
        aria-expanded={open}
        aria-label={`${menuLabel ?? aria['aria-label']}: ${current.label}. Open the views menu`}
        className={cn(
          'flex min-h-11 w-full cursor-pointer items-center justify-between gap-2 rounded border border-border-strong bg-surface px-3.5 py-2 text-left font-bold text-fg',
          'outline-none focus-visible:ring-2 focus-visible:ring-accent',
          className,
        )}
      >
        <span className="inline-flex min-w-0 items-center gap-2">
          <Icon name="list" className="shrink-0 text-fg2" />
          <span>{current.label}</span>
          <Chip badge={current.badges?.[0]} />
        </span>
        <Icon name="forward" className="shrink-0 text-fg2" />
      </Dialog.Trigger>
      <AnimatePresence>
        {open ? (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-40 bg-scrim"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduced ? 0 : 0.15 }}
              />
            </Dialog.Overlay>
            <Dialog.Content asChild forceMount aria-describedby={undefined}>
              <motion.nav
                id={drawerId}
                aria-label={aria['aria-label']}
                initial={reduced ? false : { x: '-100%' }}
                animate={{ x: 0 }}
                exit={reduced ? undefined : { x: '-100%', transition: { duration: 0.15 } }}
                transition={{ duration: reduced ? 0 : 0.2, ease: EASE_OUT }}
                className="fixed inset-y-0 left-0 z-41 flex w-[min(290px,86vw)] flex-col gap-0.5 overflow-y-auto border-r border-border-strong bg-surface px-2.5 pt-[calc(14px+env(safe-area-inset-top,0px))] pb-4 text-fg shadow-sheet"
              >
                <div className="flex items-center justify-between pr-1 pb-2 pl-3">
                  <Dialog.Title className="font-bold">{title}</Dialog.Title>
                  <Dialog.Close asChild>
                    <IconButton variant="ghost" size="xs" label="Close the views menu">
                      <Icon name="x" />
                    </IconButton>
                  </Dialog.Close>
                </div>
                {items.map((item) => {
                  const on = item.value === current.value
                  return (
                    <button
                      key={item.value}
                      type="button"
                      disabled={item.disabled}
                      aria-current={on ? 'page' : undefined}
                      onClick={() => {
                        onChange(item.value)
                        setOpen(false)
                      }}
                      className={cn(
                        'flex min-h-12 w-full cursor-pointer items-center justify-between gap-2 rounded-sm border-0 px-3 text-left font-semibold outline-none',
                        'focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-45',
                        on ? 'bg-accent-subtle text-accent' : 'bg-transparent text-fg hover:bg-elev',
                      )}
                    >
                      <span>{item.label}</span>
                      <Chip badge={item.badges?.[0]} />
                    </button>
                  )
                })}
              </motion.nav>
            </Dialog.Content>
          </Dialog.Portal>
        ) : null}
      </AnimatePresence>
    </Dialog.Root>
  )
}
