'use client'

import { cn } from '@rotra/ui/cn'
import { RequiredPill } from '@rotra/ui/field'
import { Icon } from '@rotra/ui/icon'
import { pickChipClass } from '@rotra/ui/pick-chip/variants'
import { RadioGroup } from 'radix-ui'
import { useId } from 'react'

export type GenderValue = 'male' | 'female'

const OPTIONS: { value: GenderValue; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
]

export type GenderChipsProps = {
  /** Picked gender, or '' when nothing is picked yet */
  value: GenderValue | ''
  onChange: (value: GenderValue) => void
  /** Shows the green Required pill after the label (Your details). Opt-in. */
  required?: boolean
  /** "Choose Male or Female." */
  error?: string
  /** Replaces the default hint under the chips */
  hint?: string
  disabled?: boolean
  className?: string
}

/**
 * The Gender · public chips of Your details (P-ONBOARD step 1): Male and Female, one pick, with
 * the hint about match categories. Required when registering (owner, November 19, 2026).
 */
export function GenderChips({
  value,
  onChange,
  required,
  error,
  hint = "Clubs use it to name your matches: Men's, Women's or Mixed Doubles.",
  disabled,
  className,
}: GenderChipsProps) {
  const labelId = useId()
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <span id={labelId} className="text-[13px] font-semibold text-fg2">
        Gender{required ? <RequiredPill /> : null} ·{' '}
        <span className="text-xs font-normal">public</span>
      </span>
      <RadioGroup.Root
        aria-labelledby={labelId}
        value={value}
        onValueChange={(next) => {
          if (next) onChange(next as GenderValue)
        }}
        disabled={disabled}
        className="flex flex-wrap gap-2"
      >
        {OPTIONS.map((option) => (
          <RadioGroup.Item key={option.value} value={option.value} className={pickChipClass}>
            <Icon name="check" size={14} className="hidden group-aria-checked:block" />
            {option.label}
          </RadioGroup.Item>
        ))}
      </RadioGroup.Root>
      {error ? (
        <span aria-live="polite" className="text-[13px] font-semibold text-error">
          {error}
        </span>
      ) : (
        <span className="text-xs font-normal text-fg2">{hint}</span>
      )}
    </div>
  )
}
