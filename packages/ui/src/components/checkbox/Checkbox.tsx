'use client'

import { cn } from '@rotra/ui/cn'
import { type ReactNode, type Ref, useId } from 'react'

export type CheckboxProps = {
  /** Bold first line */
  label: ReactNode
  /** Muted second line */
  description?: ReactNode
  checked?: boolean
  onChange?: (checked: boolean) => void
  onBlur?: () => void
  name?: string
  ref?: Ref<HTMLInputElement>
  disabled?: boolean
  id?: string
  className?: string
}

/**
 * The prototypes' .check: a bordered row with a checkbox and its label (e.g. which result slides to
 * publish). The box is 18 px, 22 px on touch screens.
 */
export function Checkbox({
  label,
  description,
  checked,
  onChange,
  onBlur,
  name,
  ref,
  disabled,
  id,
  className,
}: CheckboxProps) {
  const autoId = useId()
  const inputId = id ?? `check${autoId}`
  return (
    <label
      htmlFor={inputId}
      className={cn(
        'flex cursor-pointer items-start gap-2.5 rounded-md border border-border-strong px-3 py-2.5',
        'has-disabled:cursor-not-allowed has-disabled:opacity-45',
        className,
      )}
    >
      <input
        ref={ref}
        id={inputId}
        type="checkbox"
        name={name}
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange?.(event.target.checked)}
        onBlur={onBlur}
        className="mt-0.5 size-[18px] flex-none accent-accent touch:size-[22px]"
      />
      <span className="min-w-0">
        <b className="font-bold">{label}</b>
        {description ? <span className="block text-[13px] text-fg2">{description}</span> : null}
      </span>
    </label>
  )
}
