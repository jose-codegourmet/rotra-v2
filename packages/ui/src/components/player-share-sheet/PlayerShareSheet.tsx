import { Sheet } from '@rotra/ui/sheet'
import type { ReactNode } from 'react'
export type PlayerShareSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  children: ReactNode
}
/** Card contents reuse ShareCard, including the format selector and canvas export. */
export function PlayerShareSheet({ open, onOpenChange, title, children }: PlayerShareSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={title}>
      {children}
    </Sheet>
  )
}
