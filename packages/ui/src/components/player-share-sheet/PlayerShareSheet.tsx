import { ShareDialog } from '@rotra/ui/share-dialog'
import type { ReactNode } from 'react'
export type PlayerShareSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  children: ReactNode
}
/** Player's Share profile / rank / result / games dialog: the shared ShareDialog (680 px, Close). */
export function PlayerShareSheet({ open, onOpenChange, title, children }: PlayerShareSheetProps) {
  return (
    <ShareDialog open={open} onOpenChange={onOpenChange} title={title}>
      {children}
    </ShareDialog>
  )
}
