'use client'

import type { FeatureFlag } from '@rotra/data/feature-flag/types'
import { Chip } from '@rotra/ui/chip'
import { cn } from '@rotra/ui/cn'
import { KeyValueList } from '@rotra/ui/key-value-list'
import { Switch } from '@rotra/ui/switch'

export type FeatureFlagRowProps = {
  flag: FeatureFlag
  /** Email of the Admin who made the last change; shown after its time */
  lastChangedBy?: string
  /** The switch was pressed: the container confirms the new value before saving it */
  onRequestToggle: (key: string) => void
  /** While this flag's change is saving, or the Admin is offline */
  disabled?: boolean
  className?: string
}

const WHEN = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'Asia/Manila',
})

function lastChange(flag: FeatureFlag, lastChangedBy?: string) {
  if (!flag.changedAt) return 'Never changed'
  const at = WHEN.format(new Date(flag.changedAt))
  return lastChangedBy ? `${at} · ${lastChangedBy}` : at
}

/**
 * A-FEATURE-FLAGS: one flag in the list: its name, value chip and fixed key, what it does, its last
 * change and its value switch. The switch never changes the value itself; it asks the container,
 * which confirms first. The key has no editor: it can't be changed after the flag is created.
 */
export function FeatureFlagRow({
  flag,
  lastChangedBy,
  onRequestToggle,
  disabled,
  className,
}: FeatureFlagRowProps) {
  return (
    <div className={cn('flex items-start justify-between gap-4', className)}>
      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <b className="[overflow-wrap:anywhere]">{flag.name}</b>
          {flag.on ? <Chip tone="accent">On</Chip> : <Chip>Off</Chip>}
          <span className="font-mono text-xs text-fg2 [overflow-wrap:anywhere]">{flag.key}</span>
        </div>
        <p className="m-0 text-[13px] [overflow-wrap:anywhere]">{flag.description}</p>
        <KeyValueList
          className="text-[13px]"
          items={[{ label: 'Last change', value: lastChange(flag, lastChangedBy) }]}
        />
      </div>
      <Switch
        checked={flag.on}
        // Controlled: the value only changes once the container saves the confirmed change.
        onChange={() => onRequestToggle(flag.key)}
        disabled={disabled}
        aria-label={`${flag.name}, ${flag.on ? 'on' : 'off'}`}
      />
    </div>
  )
}
