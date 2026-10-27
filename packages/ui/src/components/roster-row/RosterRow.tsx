'use client'

import type { PlayingLevel } from '@rotra/data/player/types'
import { Avatar } from '@rotra/ui/avatar'
import { cn } from '@rotra/ui/cn'
import { Icon } from '@rotra/ui/icon'
import { IconButton } from '@rotra/ui/icon-button'
import { IdentityChip } from '@rotra/ui/identity-chip'
import type { Identity } from '@rotra/ui/identity-chip/variants'
import { LevelDiffIndicator } from '@rotra/ui/level-diff-indicator'
import { levelLabel } from '@rotra/ui/level-pill'
import { LevelSelect } from '@rotra/ui/level-select'
import { Switch } from '@rotra/ui/switch'
import { useId } from 'react'

export type RosterRowProps = {
  name: string
  photoUrl?: string
  identity: Identity
  /** The Player Information suggestion; null when there is none */
  suggestion: PlayingLevel | null
  /** The club's level for this session; null until the Queue Master sets it */
  level: PlayingLevel | null
  present: boolean
  /** Levels lock when the session starts */
  levelLocked?: boolean
  onOpenProfile: () => void
  onLevelChange: (level: PlayingLevel) => void
  onPresentChange: (present: boolean) => void
  onRemove: () => void
  className?: string
}

/**
 * One confirmed slot on the preparation roster (the prototype's .prow): picture, name, identity,
 * suggestion, the level select with its diff indicator, the Present switch and remove. Phones stack
 * the name, then the level, then Present and remove.
 */
export function RosterRow({
  name,
  photoUrl,
  identity,
  suggestion,
  level,
  present,
  levelLocked,
  onOpenProfile,
  onLevelChange,
  onPresentChange,
  onRemove,
  className,
}: RosterRowProps) {
  const diffId = useId()
  return (
    <div
      className={cn(
        'grid min-w-0 grid-cols-1 gap-2 py-2.5',
        'sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] sm:items-center sm:gap-3',
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <Avatar name={name} src={photoUrl} onClick={onOpenProfile} />
        <div className="flex min-w-0 flex-1 flex-col">
          <b className="font-semibold [overflow-wrap:anywhere]">{name}</b>
          <div className="flex flex-wrap items-center gap-1.5">
            <IdentityChip identity={identity} />
            <span className="text-[13px] text-fg2">
              {suggestion ? `Suggestion: ${levelLabel(suggestion)}` : 'No suggestion'}
            </span>
          </div>
        </div>
      </div>
      <div className="order-2 flex min-w-0 flex-col gap-1 sm:order-none">
        <LevelSelect
          value={level}
          onChange={onLevelChange}
          missing={level === null}
          disabled={levelLocked}
          aria-label={`Level for ${name} at this club`}
          aria-describedby={diffId}
        />
        <LevelDiffIndicator id={diffId} level={level} suggestion={suggestion} />
      </div>
      <div className="order-3 flex flex-nowrap items-center justify-between gap-2 sm:order-none sm:justify-start">
        <span className="text-[13px] text-fg2">Present</span>
        <Switch checked={present} onChange={onPresentChange} aria-label={`${name} present`} />
        <IconButton
          size="xs"
          variant="ghost"
          label={`Remove ${name} from roster`}
          onClick={onRemove}
        >
          <Icon name="x" />
        </IconButton>
      </div>
    </div>
  )
}
