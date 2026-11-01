'use client'

import { cn } from '@rotra/ui/cn'
import { type ReactNode, type Ref, useId } from 'react'
import { type CheckboxVariants, checkboxVariants } from './Checkbox.variants'

export type CheckboxProps = CheckboxVariants & {
  /** Bold first line; screen-reader-only in the compact presentation. */
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
 * publish), or compact player selection with a screen-reader label. The box is 18 px,
 * 22 px on touch screens; compact hit areas remain 32/44 px.
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
  variant = 'row',
}: CheckboxProps) {
  const autoId = useId()
  const inputId = id ?? `check${autoId}`
  return (
    <label htmlFor={inputId} className={cn(checkboxVariants({ variant }), className)}>
      <input
        ref={ref}
        id={inputId}
        type="checkbox"
        name={name}
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange?.(event.target.checked)}
        onBlur={onBlur}
        className={cn(
          'size-[18px] flex-none accent-accent touch:size-[22px]',
          variant === 'compact' ? 'cursor-inherit focus-visible:outline-none' : 'mt-0.5',
        )}
      />
      <span className={variant === 'compact' ? 'sr-only' : 'min-w-0'}>
        <b className="font-bold">{label}</b>
        {description ? <span className="block text-[13px] text-fg2">{description}</span> : null}
      </span>
    </label>
  )
}
