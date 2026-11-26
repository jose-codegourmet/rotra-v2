'use client'

import { cn } from '@rotra/ui/cn'
import { Field } from '@rotra/ui/field'
import { Icon } from '@rotra/ui/icon'
import { pickChipClass } from '@rotra/ui/pick-chip/variants'
import { TextInput } from '@rotra/ui/text-input'
import { RadioGroup } from 'radix-ui'

export const FAVORITE_PLAYERS: { value: string; label: string }[] = [
  { value: 'lindan', label: 'Lin Dan' },
  { value: 'lcw', label: 'Lee Chong Wei' },
  { value: 'axelsen', label: 'Viktor Axelsen' },
  { value: 'momota', label: 'Kento Momota' },
  { value: 'taufik', label: 'Taufik Hidayat' },
  { value: 'chenlong', label: 'Chen Long' },
  { value: 'marin', label: 'Carolina Marín' },
  { value: 'tty', label: 'Tai Tzu-ying' },
  { value: 'anseyoung', label: 'An Se-young' },
  { value: 'other', label: 'Others' },
]

export type FavoritePlayerChipsProps = {
  /** Picked player value, "other" for Others, or '' when nothing is picked */
  value: string
  onChange: (value: string) => void
  /** The typed name, used when value is "other" */
  otherName: string
  onOtherNameChange: (name: string) => void
  /** Shown under the name box, e.g. "Type the player's name, or pick another answer." (the screen decides when) */
  error?: string
  'aria-label'?: string
  disabled?: boolean
  className?: string
}

/**
 * The Favorite player answers: 9 players and Others (one pick). Others opens a Player's name box.
 * Used in the onboarding step 4 and Edit profile.
 */
export function FavoritePlayerChips({
  value,
  onChange,
  otherName,
  onOtherNameChange,
  error,
  disabled,
  className,
  ...aria
}: FavoritePlayerChipsProps) {
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <RadioGroup.Root
        aria-label={aria['aria-label'] ?? 'Favorite badminton player'}
        value={value}
        onValueChange={(next) => {
          if (next) onChange(next)
        }}
        disabled={disabled}
        className="flex flex-wrap gap-2"
      >
        {FAVORITE_PLAYERS.map((player) => (
          <RadioGroup.Item key={player.value} value={player.value} className={pickChipClass}>
            <Icon name="check" size={14} className="hidden group-aria-checked:block" />
            {player.label}
          </RadioGroup.Item>
        ))}
      </RadioGroup.Root>
      {value === 'other' ? (
        <Field label="Player's name" error={error}>
          <TextInput
            value={otherName}
            placeholder="Who do you look up to?"
            autoComplete="off"
            onChange={(e) => onOtherNameChange(e.target.value)}
          />
        </Field>
      ) : null}
    </div>
  )
}
