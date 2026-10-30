'use client'

import { Button } from '@rotra/ui/button'
import { Notice } from '@rotra/ui/notice'
import { Sheet } from '@rotra/ui/sheet'
import { type ReactNode, useEffect, useRef } from 'react'

export type ConfirmSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** From dialogs.md, e.g. "Confirm match result", "Mark match invalid?" */
  title: ReactNode
  /** The target: session, players, match, courts, the values being confirmed */
  summary?: ReactNode
  /** What happens and what cannot be undone, word for word from dialogs.md */
  consequence: ReactNode
  /** A small muted line after the consequence, e.g. what does not change */
  note?: ReactNode
  /** Names the action ("Confirm invalid match", "Start session"); never a neutral "Save" */
  confirmLabel: string
  onConfirm: () => void
  /** "Back", "Back to result", "Keep playing" */
  backLabel?: string
  /** Called by the secondary button; defaults to closing */
  onBack?: () => void
  /** The commit is running: the primary shows a spinner and nothing can fire twice */
  isPending?: boolean
  /** Why the commit failed; shown above the buttons, nothing is claimed as saved */
  error?: ReactNode
  /** Danger styling for the primary (invalid match, reset) */
  destructive?: boolean
  /** Primary stays disabled until the choice is complete (e.g. courts not chosen) */
  confirmDisabled?: boolean
}

/**
 * The pattern behind every D- dialog: title, target summary, consequence copy, Back, and a primary
 * button that names the action. Focus starts on the title, never on the primary; repeated taps
 * cannot commit twice; a failure is reported without pretending success.
 */
export function ConfirmSheet({
  open,
  onOpenChange,
  title,
  summary,
  consequence,
  note,
  confirmLabel,
  onConfirm,
  backLabel = 'Back',
  onBack,
  isPending = false,
  error,
  destructive,
  confirmDisabled,
}: ConfirmSheetProps) {
  // One commit per attempt, even if a second click lands before the parent re-renders with isPending.
  const fired = useRef(false)
  useEffect(() => {
    if (!open || !isPending || error) fired.current = false
  }, [open, isPending, error])

  const confirm = () => {
    if (fired.current || isPending) return
    fired.current = true
    onConfirm()
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!isPending) onOpenChange(next)
      }}
      title={title}
      dismissible={!isPending}
      hideClose={isPending}
      footer={
        <>
          <Button disabled={isPending} onClick={onBack ?? (() => onOpenChange(false))}>
            {backLabel}
          </Button>
          <Button
            variant={destructive ? 'danger' : 'primary'}
            loading={isPending}
            disabled={confirmDisabled}
            onClick={confirm}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {summary}
      <p className="m-0">{consequence}</p>
      {note ? <p className="m-0 text-[13px] text-fg2">{note}</p> : null}
      {error ? <Notice tone="error">{error}</Notice> : null}
    </Sheet>
  )
}
