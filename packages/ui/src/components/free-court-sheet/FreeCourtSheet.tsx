'use client'

import { Button } from '@rotra/ui/button'
import { cn } from '@rotra/ui/cn'
import { Icon, type IconName } from '@rotra/ui/icon'
import { Sheet } from '@rotra/ui/sheet'
import type { ReactNode } from 'react'

export type FreeCourtSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The free court's label, e.g. "Court 2" */
  courtLabel: string
  /** How many matches wait in the Main Queue; 0 disables Pick from the queue */
  waitingCount: number
  /** Pick from the queue: opens Put a match on Court N */
  onPick: () => void
  /** Generate a match: opens the Suggested match for this court */
  onGenerate: () => void
}

function Choice({
  icon,
  title,
  children,
  disabled,
  onClick,
}: {
  icon: IconName
  title: string
  children: ReactNode
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex min-h-[120px] min-w-0 cursor-pointer flex-col items-start gap-1.5 rounded-lg border-[1.5px] border-border-strong bg-surface p-4 text-left text-fg',
        'enabled:hover:border-accent enabled:hover:bg-accent-subtle',
        'disabled:cursor-not-allowed disabled:opacity-50',
      )}
    >
      <Icon name={icon} className="text-accent" />
      <b className="text-base">{title}</b>
      <span className="text-[13px] text-fg2">{children}</span>
    </button>
  )
}

/**
 * "Court N is free" (prototype SHEETS.freeCourt): opened by tapping a free court's picture. Two
 * large choices, Pick from the queue (disabled with "The Main Queue is empty." when nothing waits)
 * and Generate a match, and Cancel.
 */
export function FreeCourtSheet({
  open,
  onOpenChange,
  courtLabel,
  waitingCount,
  onPick,
  onGenerate,
}: FreeCourtSheetProps) {
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={`${courtLabel} is free`}
      footer={<Button onClick={() => onOpenChange(false)}>Cancel</Button>}
    >
      <p className="m-0 text-[13px] text-fg2">Choose how this court gets its next match.</p>
      <div className="grid grid-cols-1 gap-2.5 min-[481px]:grid-cols-2">
        <Choice
          icon="list"
          title="Pick from the queue"
          disabled={waitingCount === 0}
          onClick={onPick}
        >
          {waitingCount === 0
            ? 'The Main Queue is empty.'
            : `${waitingCount} match${waitingCount === 1 ? '' : 'es'} waiting. Choose one for ${courtLabel}.`}
        </Choice>
        <Choice icon="grid" title="Generate a match" onClick={onGenerate}>
          ROTRA suggests fair teams from the players who are free right now.
        </Choice>
      </div>
    </Sheet>
  )
}
