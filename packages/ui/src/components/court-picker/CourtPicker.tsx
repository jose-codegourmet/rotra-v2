'use client'

import { Button } from '@rotra/ui/button'
import { cn } from '@rotra/ui/cn'
import { useId } from 'react'

/** A free court the Queue Master can start the match on. */
export type CourtPickerCourt = {
  id: string
  label: string
}

export type CourtPickerProps = {
  /** Every free court, in session order */
  courts: CourtPickerCourt[]
  /** The chosen court ids, oldest first; at most `required` of them */
  value: string[]
  /** 1 court, or 2 for a 5v5 (two courts as one match) */
  required: 1 | 2
  /** Reports the new selection. For two courts a third pick replaces the oldest. */
  onChange: (courtIds: string[]) => void
  disabled?: boolean
  className?: string
}

/**
 * The court buttons on D-START-MATCH: "Court" with one aria-pressed button per free court, or
 * "Choose two free courts" with the hint "5v5 uses two courts as one match." Picking a court when
 * one is required replaces the choice; with two, a chosen court toggles off and a third pick
 * replaces the oldest.
 */
export function CourtPicker({
  courts,
  value,
  required,
  onChange,
  disabled,
  className,
}: CourtPickerProps) {
  const id = useId()
  const labelId = `court-picker${id}-label`
  const hintId = required === 2 ? `court-picker${id}-hint` : undefined
  const pick = (courtId: string) => {
    if (required === 1) {
      onChange([courtId])
      return
    }
    onChange(
      value.includes(courtId) ? value.filter((c) => c !== courtId) : [...value, courtId].slice(-2),
    )
  }
  return (
    <div
      role="group"
      aria-labelledby={labelId}
      aria-describedby={hintId}
      className={cn('flex min-w-0 flex-col gap-1.5', className)}
    >
      <span id={labelId} className="text-[13px] font-semibold text-fg2">
        {required === 2 ? 'Choose two free courts' : 'Court'}
      </span>
      <div className="flex flex-wrap items-center gap-2">
        {courts.map((court) => (
          <Button
            key={court.id}
            size="sm"
            aria-pressed={value.includes(court.id)}
            disabled={disabled}
            onClick={() => pick(court.id)}
          >
            {court.label}
          </Button>
        ))}
      </div>
      {hintId ? (
        <span id={hintId} className="text-xs font-normal text-fg2">
          5v5 uses two courts as one match.
        </span>
      ) : null}
    </div>
  )
}
