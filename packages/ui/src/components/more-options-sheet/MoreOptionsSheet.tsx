'use client'

import { Button } from '@rotra/ui/button'
import { Sheet } from '@rotra/ui/sheet'

export type MoreOptionsAction = {
  label: string
  onSelect: () => void
  danger?: boolean
}

export type MoreOptionsSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  actions: MoreOptionsAction[]
}

/** Phone preparation actions, with destructive actions opening their usual confirmations. */
export function MoreOptionsSheet({ open, onOpenChange, actions }: MoreOptionsSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="More options">
      <div className="flex flex-col gap-3">
        {actions.map((action) => (
          <Button
            key={action.label}
            block
            variant={action.danger ? 'danger' : 'secondary'}
            onClick={() => {
              onOpenChange(false)
              action.onSelect()
            }}
          >
            {action.label}
          </Button>
        ))}
      </div>
    </Sheet>
  )
}
