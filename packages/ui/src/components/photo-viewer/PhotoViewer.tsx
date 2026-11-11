'use client'

import { cn } from '@rotra/ui/cn'
import { Icon } from '@rotra/ui/icon'
import { AnimatePresence, motion, useReducedMotionConfig } from 'motion/react'
import { Dialog } from 'radix-ui'
import { useRef } from 'react'

export type PhotoViewerProps = {
  open: boolean
  /** Called on a tap anywhere on the overlay, the × or Esc */
  onClose: () => void
  /** The picture to show full size: an uploaded photo or a character image, never initials */
  src: string
  /** Whose picture it is, as this viewer may see it; names the dialog and the image “Photo of NAME” */
  name: string
  /** Replaces “Photo of NAME” as the dialog and image name (e.g. a club logo) */
  label?: string
  className?: string
}

/**
 * D-PHOTO-VIEWER (#716): the full photo on a black overlay (--photo-scrim, the same in both themes),
 * centred, at most 560 px and always inside the screen, with a × at the top right. It closes on a tap
 * anywhere on the overlay, the × or Esc; Esc closes only this dialog, not a sheet under it. The hidden
 * title is focused on open and focus returns to whatever opened it. No fade under reduced motion.
 */
export function PhotoViewer({ open, onClose, src, name, label, className }: PhotoViewerProps) {
  const reduced = useReducedMotionConfig()
  const titleRef = useRef<HTMLHeadingElement>(null)
  const dialogName = label ?? `Photo of ${name}`

  // Remember the opener (an Avatar or the big photo in a profile sheet) so closing returns there,
  // even when a sheet stays open underneath.
  const returnFocus = useRef<HTMLElement | null>(null)
  const wasOpen = useRef(false)
  if (open && !wasOpen.current && typeof document !== 'undefined') {
    returnFocus.current = document.activeElement as HTMLElement | null
  }
  wasOpen.current = open

  const fade = { duration: reduced ? 0 : 0.15 }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
    >
      <AnimatePresence>
        {open ? (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-60 bg-photo-scrim"
                initial={reduced ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={reduced ? undefined : { opacity: 0 }}
                transition={fade}
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
                if (returnFocus.current?.isConnected) returnFocus.current.focus()
              }}
            >
              <motion.div
                initial={reduced ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={reduced ? undefined : { opacity: 0 }}
                transition={fade}
                onClick={(event) => {
                  // The overlay closes; the photo itself does not.
                  if (event.target === event.currentTarget) onClose()
                }}
                className={cn(
                  'fixed inset-0 z-60 grid cursor-zoom-out place-items-center px-4 py-16 text-photo-fg',
                  className,
                )}
              >
                <Dialog.Title ref={titleRef} tabIndex={-1} className="sr-only">
                  {dialogName}
                </Dialog.Title>
                <Dialog.Close
                  aria-label="Close"
                  title="Close"
                  className="absolute top-[calc(12px+env(safe-area-inset-top,0px))] right-3 grid size-11 cursor-pointer place-items-center rounded-full border border-photo-fg/45 bg-transparent p-0 text-photo-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-photo-fg"
                >
                  <Icon name="x" />
                </Dialog.Close>
                <div className="aspect-square w-[min(100%,560px,calc(100dvh-128px))] cursor-default overflow-hidden rounded-lg">
                  <img src={src} alt={dialogName} className="block size-full object-contain" />
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        ) : null}
      </AnimatePresence>
    </Dialog.Root>
  )
}
