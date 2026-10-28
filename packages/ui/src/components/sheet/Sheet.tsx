'use client'

import { cn } from '@rotra/ui/cn'
import { PHONE_QUERY, useMediaQuery } from '@rotra/ui/hooks/use-media-query'
import { Icon } from '@rotra/ui/icon'
import { IconButton } from '@rotra/ui/icon-button'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Dialog } from 'radix-ui'
import { type ReactNode, useRef } from 'react'

export type SheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Names the task; focused when the sheet opens */
  title: ReactNode
  /** The sheet body (.sb): scrolls when long */
  children?: ReactNode
  /** Buttons along the bottom edge: secondary first, then the named primary action */
  footer?: ReactNode
  /** 820 px instead of 560 px on wide screens */
  wide?: boolean
  /** Hides the header close button (e.g. while a permanent save is pending) */
  hideClose?: boolean
  /** Stops Escape and the scrim from closing it (e.g. while a permanent save is pending) */
  dismissible?: boolean
  className?: string
}

// Durations and easing from the prototypes: scrim fades in 0.15 s; the sheet pops in 0.16 s
// (centered) or slides up 0.18 s (docked to the bottom on phones).
const EASE_OUT = [0, 0, 0.58, 1] as const

/**
 * The prototypes' .sheet: every task and dialog. Centered on wide screens, a bottom sheet on phones,
 * with a scrim, the title focused on open, a focus trap, Escape to close, and focus returned to
 * whatever opened it.
 */
export function Sheet({
  open,
  onOpenChange,
  title,
  children,
  footer,
  wide,
  hideClose,
  dismissible = true,
  className,
}: SheetProps) {
  const phone = useMediaQuery(PHONE_QUERY)
  const reduced = useReducedMotion()
  const titleRef = useRef<HTMLHeadingElement>(null)

  // Remember what had focus when the sheet opened, so closing returns there. Radix only returns focus
  // to its own Dialog.Trigger, and sheets here are opened from any button, card or player picture.
  const returnFocus = useRef<HTMLElement | null>(null)
  const wasOpen = useRef(false)
  if (open && !wasOpen.current && typeof document !== 'undefined') {
    returnFocus.current = document.activeElement as HTMLElement | null
  }
  wasOpen.current = open

  const from = phone ? { opacity: 0, x: 0, y: 30 } : { opacity: 0, x: '-50%', y: '-48%' }
  const to = phone ? { opacity: 1, x: 0, y: 0 } : { opacity: 1, x: '-50%', y: '-50%' }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
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
            <Dialog.Content
              asChild
              forceMount
              aria-describedby={undefined}
              onOpenAutoFocus={(event) => {
                event.preventDefault()
                titleRef.current?.focus()
              }}
              onCloseAutoFocus={(event) => {
                event.preventDefault()
                returnFocus.current?.focus()
              }}
              onEscapeKeyDown={(event) => {
                if (!dismissible) event.preventDefault()
              }}
              onPointerDownOutside={(event) => {
                if (!dismissible) event.preventDefault()
              }}
            >
              <motion.div
                initial={reduced ? false : from}
                animate={to}
                exit={reduced ? undefined : { ...from, transition: { duration: 0.12 } }}
                transition={{ duration: reduced ? 0 : phone ? 0.18 : 0.16, ease: EASE_OUT }}
                className={cn(
                  'fixed z-41 flex flex-col border border-border-strong bg-surface text-fg shadow-sheet',
                  phone
                    ? 'inset-x-0 bottom-0 max-h-[92dvh] w-full rounded-t-2xl pb-[env(safe-area-inset-bottom,0px)]'
                    : cn(
                        'top-1/2 left-1/2 max-h-[calc(100dvh-40px)] rounded-2xl',
                        wide
                          ? 'w-[min(820px,calc(100vw-24px))]'
                          : 'w-[min(560px,calc(100vw-24px))]',
                      ),
                  className,
                )}
              >
                <header className="flex shrink-0 items-start justify-between gap-3 px-5 pt-[18px] pb-1.5">
                  <Dialog.Title ref={titleRef} tabIndex={-1} className="focus:outline-none">
                    {title}
                  </Dialog.Title>
                  {hideClose ? null : (
                    <Dialog.Close asChild>
                      <IconButton variant="ghost" size="xs" label="Close">
                        <Icon name="x" />
                      </IconButton>
                    </Dialog.Close>
                  )}
                </header>
                <div className="flex min-h-0 flex-col gap-3.5 overflow-y-auto px-5 pt-2.5 pb-4">
                  {children}
                </div>
                {footer ? (
                  <footer className="flex shrink-0 flex-wrap justify-end gap-2.5 border-t border-border px-5 pt-3 pb-[18px] [&>*]:flex-auto">
                    {footer}
                  </footer>
                ) : null}
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        ) : null}
      </AnimatePresence>
    </Dialog.Root>
  )
}
