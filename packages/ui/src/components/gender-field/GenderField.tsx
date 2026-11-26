'use client'

import { Field } from '@rotra/ui/field'
import { SegmentedControl } from '@rotra/ui/segmented-control'

export type GenderValue = 'male' | 'female' | ''

export const GENDER_HINT =
  "Sets the match category: Men's, Women's, Mixed or Genderless. Matches with a player whose gender isn't given count as Genderless."

const OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: '', label: 'Not given' },
]

export type GenderFieldProps = {
  /** '' is Not given */
  value: GenderValue
  onChange: (value: GenderValue) => void
  disabled?: boolean
}

/**
 * Gender (optional) for the Queue Master's own records, guests and unclaimed players: Male · Female ·
 * Not given, with the match category hint. Used by Add player › New player and Edit details.
 */
export function GenderField({ value, onChange, disabled }: GenderFieldProps) {
  return (
    <Field label="Gender" optional hint={GENDER_HINT}>
      <SegmentedControl
        aria-label="Gender"
        options={OPTIONS}
        value={value}
        onChange={(next) => onChange(next as GenderValue)}
        disabled={disabled}
      />
    </Field>
  )
}
