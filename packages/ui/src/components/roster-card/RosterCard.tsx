'use client'

import type { PlayingLevel } from '@rotra/data/player/types'
import { Avatar } from '@rotra/ui/avatar'
import { Card } from '@rotra/ui/card'
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

export type RosterCardProps = {
  name: string
  photoUrl?: string
  identity: Identity
  /** The Player Information suggestion; null when there is none */
  suggestion: PlayingLevel | null
  /** The club's level for this session; null until the Queue Master sets it */
  level: PlayingLevel | null
  present: boolean
  presencePending?: boolean
  /** Whether this player has a payment mark for the session */
  paid?: boolean
  /** Levels lock when the session starts: "LEVEL · Fixed after start", no select */
  levelLocked?: boolean
  /** Settings summary: presence is text and removal is unavailable. */
  readOnly?: boolean
  onOpenProfile: () => void
  onLevelChange: (level: PlayingLevel) => void
  onPresentChange: (present: boolean) => void
  onRemove: () => void
  className?: string
}

/**
 * One confirmed slot on the preparation roster grid (the prototype's .rv-card): picture, name,
 * identity chip, remove, suggestion, the level select or "LEVEL · Fixed after start", the
 * suggestion indicator, Present or Present/Away, and Paid / Not paid.
 */
export function RosterCard({
  name,
  photoUrl,
  identity,
  suggestion,
  level,
  present,
  presencePending = false,
  paid = false,
  levelLocked,
  readOnly = false,
  onOpenProfile,
  onLevelChange,
  onPresentChange,
  onRemove,
  className,
}: RosterCardProps) {
  const diffId = useId()
  const afterStart = Boolean(levelLocked || readOnly)
  return (
    <Card asChild padding="none" className={cn('flex flex-col gap-2 p-3 shadow-card', className)}>
      <article aria-label={name}>
        <div className="flex min-w-0 items-start gap-2.5">
          <Avatar name={name} src={photoUrl} onClick={onOpenProfile} />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <b className="font-semibold [overflow-wrap:anywhere]">{name}</b>
            <IdentityChip identity={identity} />
          </div>
          {!afterStart ? (
            <IconButton
              size="xs"
              variant="ghost"
              label={`Remove ${name} from roster`}
              onClick={onRemove}
            >
              <Icon name="x" />
            </IconButton>
          ) : null}
        </div>
        <span className="text-[13px] text-fg2">
          {suggestion ? `Suggestion: ${levelLabel(suggestion)}` : 'No suggestion'}
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          {afterStart ? (
            <span className="font-semibold [overflow-wrap:anywhere]">
              {level ? levelLabel(level) : 'No level'} · Fixed after start
            </span>
          ) : (
            <LevelSelect
              value={level}
              onChange={onLevelChange}
              missing={level === null}
              aria-label={`Level for ${name} at this club`}
              aria-describedby={diffId}
            />
          )}
          <LevelDiffIndicator id={diffId} level={level} suggestion={suggestion} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          {afterStart ? (
            <span className="text-[13px] text-fg2">
              {presencePending ? 'Saving presence…' : present ? 'Present' : 'Away'}
            </span>
          ) : (
            <span className="flex flex-nowrap items-center gap-2">
              <span className="text-[13px] text-fg2">
                {presencePending ? 'Saving presence…' : 'Present'}
              </span>
              <Switch checked={present} onChange={onPresentChange} aria-label={`${name} present`} />
            </span>
          )}
          {paid ? (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-accent">
              <Icon name="check" size={13} />
              Paid
            </span>
          ) : (
            <span className="text-xs text-fg2">Not paid</span>
          )}
        </div>
      </article>
    </Card>
  )
}
