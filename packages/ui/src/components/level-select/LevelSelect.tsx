'use client'

import { PLAYING_LEVELS, type PlayingLevel } from '@rotra/data/player/types'
import { Select, type SelectOptionGroup } from '@rotra/ui/select'
import type { Ref } from 'react'

export type LevelSelectProps = {
  value: PlayingLevel | null
  onChange: (level: PlayingLevel) => void
  onBlur?: () => void
  name?: string
  ref?: Ref<HTMLButtonElement>
  /** Required accessible name, e.g. "Level for Migs at this club" (also used by a Field label) */
  'aria-label'?: string
  /** Points at the LevelDiffIndicator */
  'aria-describedby'?: string
  /** The level is missing: error border */
  missing?: boolean
  /** Locked after the session started */
  disabled?: boolean
  className?: string
}

/** "intermediate_mid" → "Intermediate Mid" */
export function levelLabel(level: PlayingLevel): string {
  return level
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

const BANDS = ['beginner', 'intermediate', 'advanced'] as const

/** The nine playing levels grouped by band, as the prototype's selectLevel() lists them. */
export const LEVEL_OPTION_GROUPS: SelectOptionGroup[] = BANDS.map((band) => ({
  label: band.charAt(0).toUpperCase() + band.slice(1),
  options: PLAYING_LEVELS.filter((l) => l.startsWith(band)).map((l) => ({
    value: l,
    label: levelLabel(l),
  })),
}))

/** The nine-level selector grouped Beginner / Intermediate / Advanced with "Choose a level…". */
export function LevelSelect({ value, onChange, missing, ...props }: LevelSelectProps) {
  return (
    <Select
      options={LEVEL_OPTION_GROUPS}
      value={value ?? ''}
      onChange={(next) => onChange(next as PlayingLevel)}
      placeholder="Choose a level…"
      invalid={missing}
      {...props}
    />
  )
}
