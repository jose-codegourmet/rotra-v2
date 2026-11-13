'use client'

import { Button } from '@rotra/ui/button'
import { Sheet } from '@rotra/ui/sheet'
import type { ReactNode } from 'react'

export type ShareDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** “Share profile”, “Share rank”, “Share your finish”, “Share leaderboard” */
  title: string
  /** Usually a ShareImagePicker; loading, error and empty states while its data loads */
  children: ReactNode
  /** Replaces the Close footer */
  footer?: ReactNode
}

/**
 * Every share dialog except the Session and club invites (2026-11-13 share dialog logs): the wide
 * sheet at most 680 px wide (full width on phones), footer Close only. Put a ShareImagePicker inside.
 */
export function ShareDialog({ open, onOpenChange, title, children, footer }: ShareDialogProps) {
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      wide
      className="min-[641px]:w-[min(680px,calc(100vw-32px))]"
      footer={footer ?? <Button onClick={() => onOpenChange(false)}>Close</Button>}
    >
      {children}
    </Sheet>
  )
}
