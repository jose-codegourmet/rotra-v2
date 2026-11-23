'use client'

import { cn } from '@rotra/ui/cn'
import { Icon } from '@rotra/ui/icon'
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
  /** The fieldset label; defaults to "Court", or "Choose two free courts" when two are required */
  label?: string
  disabled?: boolean
  className?: string
}

/**
 * The court tiles on D-START-MATCH (Put on court) and Move match: "Court" with a grid of large
 * aria-pressed tiles (at least 140 x 76 px), one per free court: the court name in bold, "Free now"
 * under it, and a round check in the corner that fills when picked (accent border and tint). Two
 * courts read "Choose two free courts" with the hint "5v5 uses two courts as one match." Picking a court when
 * one is required replaces the choice; with two, a chosen court toggles off and a third pick
 * replaces the oldest.
 */
export function CourtPicker({
  courts,
  value,
  required,
  onChange,
  label,
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
    <fieldset
      aria-labelledby={labelId}
      aria-describedby={hintId}
      className={cn('m-0 flex min-w-0 flex-col gap-1.5 border-0 p-0', className)}
    >
      <span id={labelId} className="text-[13px] font-semibold text-fg2">
        {label ?? (required === 2 ? 'Choose two free courts' : 'Court')}
      </span>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2.5">
        {courts.map((court) => {
          const picked = value.includes(court.id)
          return (
            <button
              key={court.id}
              type="button"
              aria-pressed={picked}
              disabled={disabled}
              onClick={() => pick(court.id)}
              className={cn(
                'relative flex min-h-[76px] min-w-0 cursor-pointer flex-col items-start gap-1 rounded-md border-[1.5px] px-4 py-3.5 text-left text-fg transition-colors',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
                'disabled:cursor-not-allowed disabled:opacity-50',
                picked
                  ? 'border-accent bg-accent-subtle shadow-[inset_0_0_0_1px_var(--color-accent)]'
                  : 'border-border-strong bg-surface hover:border-accent',
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'absolute top-2.5 right-2.5 grid size-5 place-items-center rounded-full border-[1.5px]',
                  picked
                    ? 'border-accent bg-accent text-on-accent'
                    : 'border-border-strong text-transparent',
                )}
              >
                {picked ? <Icon name="check" size={12} /> : null}
              </span>
              <b className="text-[17px] font-bold">{court.label}</b>
              <span className="text-[13px] font-normal text-fg2">Free now</span>
            </button>
          )
        })}
      </div>
      {hintId ? (
        <span id={hintId} className="text-xs font-normal text-fg2">
          5v5 uses two courts as one match.
        </span>
      ) : null}
    </fieldset>
  )
}
