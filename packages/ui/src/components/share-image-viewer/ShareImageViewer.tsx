'use client'

import { Button } from '@rotra/ui/button'
import { Icon } from '@rotra/ui/icon'
import { SHARE_IMAGE_SIZE, type ShareFormat } from '@rotra/ui/share-card/helpers'
import { Dialog } from 'radix-ui'
import { type ReactNode, useEffect, useState } from 'react'

export type ShareImageViewerProps = {
  open: boolean
  /** Called on the ×, Esc or a tap on the black backdrop */
  onClose: () => void
  /** The image's name: “Story”, “Facebook post”, “Image 2”; names the dialog “NAME, full screen” */
  label: string
  /** Sets the image's natural size (Story 270 × 480, post 320 × 400, square 320 × 320) */
  format: ShareFormat
  /** The share image itself (a ShareImage), scaled to fit the screen */
  children: ReactNode
  /** Downloads this one image */
  onDownload: () => void
  downloadDisabled?: boolean
}

/** The prototypes' shViewer scale: fit the window, never under 0.5× or over 2.4×. */
function fitScale(format: ShareFormat) {
  const [w, h] = SHARE_IMAGE_SIZE[format]
  if (typeof window === 'undefined') return 1
  return Math.max(0.5, Math.min((window.innerWidth - 32) / w, (window.innerHeight - 160) / h, 2.4))
}

/**
 * The share dialog's full-screen view (shViewer): one share image on a black backdrop, scaled to fit,
 * with its name and Download under it. Esc, the × or the backdrop closes it; Esc closes only this view,
 * not the share dialog under it.
 */
export function ShareImageViewer({
  open,
  onClose,
  label,
  format,
  children,
  onDownload,
  downloadDisabled,
}: ShareImageViewerProps) {
  const [scale, setScale] = useState(() => fitScale(format))
  useEffect(() => {
    if (!open) return
    const update = () => setScale(fitScale(format))
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [open, format])
  const [w, h] = SHARE_IMAGE_SIZE[format]

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-70 bg-photo-scrim" />
        <Dialog.Content
          aria-describedby={undefined}
          onClick={(event) => {
            if (event.target === event.currentTarget) onClose()
          }}
          className="fixed inset-0 z-70 flex cursor-zoom-out flex-col items-center justify-center gap-4 px-4 pt-[60px] pb-5 text-photo-fg focus:outline-none"
        >
          <Dialog.Title className="sr-only">{`${label}, full screen`}</Dialog.Title>
          <Dialog.Close
            aria-label="Close full screen"
            title="Close"
            className="absolute top-[calc(12px+env(safe-area-inset-top,0px))] right-3 grid size-11 cursor-pointer place-items-center rounded-full border border-photo-fg/30 bg-photo-fg/8 p-0 text-photo-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-photo-fg"
          >
            <Icon name="x" size={20} />
          </Dialog.Close>
          <div
            className="relative flex-none cursor-default"
            style={{ width: Math.round(w * scale), height: Math.round(h * scale) }}
          >
            <div
              className="absolute top-0 left-0 origin-top-left"
              style={{ transform: `scale(${scale.toFixed(3)})` }}
            >
              {children}
            </div>
          </div>
          <div className="flex cursor-default items-center gap-3">
            <b>{label}</b>
            <Button variant="primary" disabled={downloadDisabled} onClick={onDownload}>
              Download
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
