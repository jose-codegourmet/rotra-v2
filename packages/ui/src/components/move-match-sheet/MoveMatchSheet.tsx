'use client'

import { Button } from '@rotra/ui/button'
import { CourtPicker, type CourtPickerCourt } from '@rotra/ui/court-picker'
import { Notice } from '@rotra/ui/notice'
import { Sheet } from '@rotra/ui/sheet'
import type { ReactNode } from 'react'

export type MoveMatchSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  matchNo: number
  /** Where the match is now: "Court 1", or "Court 1 + Court 2" for a merged 5v5 */
  currentLabel: string
  /** Every free open court, in session order */
  courts: CourtPickerCourt[]
  /** 1 court, or 2 for a 5v5 */
  required: 1 | 2
  /** The chosen court ids */
  value: string[]
  onChange: (courtIds: string[]) => void
  /** Back returns to OnCourtSheet without changing anything */
  onBack: () => void
  /** Move match: the owner rechecks that the courts are still free */
  onConfirm: () => void
  /** The move is saving: Move match cannot fire twice and the sheet cannot be dismissed */
  isPending?: boolean
  /** Shown above the footer, e.g. "Something changed. Review the match again." after a failed recheck */
  message?: ReactNode
  /** Why the move could not be saved ("Changes could not be saved"); nothing moved */
  error?: ReactNode
}

/**
 * "Move match N" for a match On court: where it is now, the free open courts to choose from (two
 * for a 5v5), and Back / Move match (needs the right number of courts). The match stays getting
 * ready on the new court; nothing starts.
 */
export function MoveMatchSheet({
  open,
  onOpenChange,
  matchNo,
  currentLabel,
  courts,
  required,
  value,
  onChange,
  onBack,
  onConfirm,
  isPending = false,
  message,
  error,
}: MoveMatchSheetProps) {
  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!isPending) onOpenChange(next)
      }}
      title={`Move match ${matchNo}`}
      dismissible={!isPending}
      hideClose={isPending}
      footer={
        <>
          <Button disabled={isPending} onClick={onBack}>
            Back
          </Button>
          <Button
            variant="primary"
            loading={isPending}
            disabled={value.length !== required}
            onClick={onConfirm}
          >
            Move match
          </Button>
        </>
      }
    >
      <p className="m-0 text-[13px] text-fg2">
        Now on {currentLabel}. It stays getting ready on the new court.
      </p>
      {courts.length ? (
        <CourtPicker
          courts={courts}
          value={value}
          required={required}
          onChange={onChange}
          disabled={isPending}
        />
      ) : (
        <p className="m-0 text-[13px] text-fg2">No other court is free.</p>
      )}
      {message ? <Notice tone="warn">{message}</Notice> : null}
      {error ? <Notice tone="error">{error}</Notice> : null}
    </Sheet>
  )
}
