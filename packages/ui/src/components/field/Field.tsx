'use client'

import { cn } from '@rotra/ui/cn'
import { createContext, type ReactNode, useContext, useId } from 'react'

type FieldControlProps = {
  id: string
  'aria-describedby'?: string
  'aria-invalid'?: true
}

const FieldContext = createContext<FieldControlProps | null>(null)
const FieldLabelContext = createContext<string | undefined>(undefined)

/**
 * Wiring for a control placed inside a Field: its id (so the label points at it), the hint and error
 * ids for aria-describedby, and aria-invalid when the field has an error. Returns an empty object
 * outside a Field, where the control needs its own aria-label.
 */
export function useFieldControl(): Partial<FieldControlProps> {
  return useContext(FieldContext) ?? {}
}

/** The Field label's id, for controls that build their name from the label plus their value. */
export function useFieldLabelId() {
  return useContext(FieldLabelContext)
}

export type FieldProps = {
  label: ReactNode
  /** One line under the control explaining what to enter */
  hint?: ReactNode
  /** Validation message; shown next to the field and announced without moving focus */
  error?: ReactNode
  /** Adds "(optional)" to the label, as the prototypes write it */
  optional?: boolean
  /** Control id; generated when omitted */
  id?: string
  className?: string
  children: ReactNode
}

/** The prototypes' .field: label, control, hint and inline error, stacked. */
export function Field({ label, hint, error, optional, id, className, children }: FieldProps) {
  const autoId = useId()
  const controlId = id ?? `field${autoId}`
  const labelId = `${controlId}-label`
  const hintId = hint ? `${controlId}-hint` : undefined
  const errorId = error ? `${controlId}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <FieldContext.Provider
      value={{
        id: controlId,
        'aria-describedby': describedBy,
        'aria-invalid': error ? true : undefined,
      }}
    >
      <FieldLabelContext.Provider value={labelId}>
        <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
          <label id={labelId} htmlFor={controlId} className="text-[13px] font-semibold text-fg2">
            {label}
            {optional ? ' (optional)' : null}
          </label>
          {children}
          {hint ? (
            <span id={hintId} className="text-xs font-normal text-fg2">
              {hint}
            </span>
          ) : null}
          <span
            id={errorId}
            aria-live="polite"
            className="text-[13px] font-semibold text-error empty:hidden"
          >
            {error}
          </span>
        </div>
      </FieldLabelContext.Provider>
    </FieldContext.Provider>
  )
}
