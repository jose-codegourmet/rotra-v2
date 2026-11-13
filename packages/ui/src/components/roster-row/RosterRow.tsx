'use client'

import type { PlayingLevel } from '@rotra/data/player/types'
import { Avatar } from '@rotra/ui/avatar'
import { Button } from '@rotra/ui/button'
import { cn } from '@rotra/ui/cn'
import { Icon } from '@rotra/ui/icon'
import { IconButton } from '@rotra/ui/icon-button'
import { IdentityChip } from '@rotra/ui/identity-chip'
import type { Identity } from '@rotra/ui/identity-chip/variants'
import { LevelDiffIndicator } from '@rotra/ui/level-diff-indicator'
import { levelLabel } from '@rotra/ui/level-pill'
import { LevelSelectMenu } from '@rotra/ui/level-select-menu'
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
  presencePending?: boolean
  selfCheckedInAt?: number | null
  leftAt?: number | null
  /** Levels lock when the session starts: the level shows as text with a lock, no select */
  levelLocked?: boolean
  /** Settings summary: presence is text and removal is unavailable. */
  readOnly?: boolean
  /** False before Start session: no Present text or switch (presence shows once the session has started) */
  showPresence?: boolean
  onOpenProfile: () => void
  onLevelChange: (level: PlayingLevel) => void
  onPresentChange: (present: boolean) => void
  onRemove: () => void
  /**
   * Move to waitlist (#735): a secondary button next to remove, before and after Start (also in
   * the read-only summary). Omit to hide it.
   */
  onStepDown?: () => void
  className?: string
}

/**
 * One confirmed slot on the preparation roster (the prototype's .prow): picture, name, identity,
 * suggestion, the level select with its diff indicator, the Present switch, Move to waitlist and
 * remove. Phones stack the name, then the level, then Present, Move to waitlist and remove. Once levels are locked the level is plain text
 * with a lock icon and an explanation; there is no edit path.
 */
export function RosterRow({
  name,
  photoUrl,
  identity,
  suggestion,
  level,
  present,
  presencePending = false,
  selfCheckedInAt,
  leftAt,
  levelLocked,
  readOnly = false,
  showPresence = true,
  onOpenProfile,
  onLevelChange,
  onPresentChange,
  onRemove,
  onStepDown,
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
        {levelLocked || readOnly ? (
          <>
            <span className="inline-flex min-w-0 items-center gap-1.5 font-semibold">
              <Icon name="lock" size={13} className="shrink-0 text-fg2" />
              {level ? levelLabel(level) : 'No level yet'}
              <span className="sr-only"> (locked)</span>
            </span>
            <span className="text-[13px] text-fg2">
              Fixed after start. Levels can't change after the session starts.
            </span>
          </>
        ) : (
          <LevelSelectMenu
            value={level}
            onChange={onLevelChange}
            aria-label={`Level for ${name} at this club`}
            aria-describedby={diffId}
          />
        )}
        <LevelDiffIndicator id={diffId} level={level} suggestion={suggestion} />
      </div>
      <div className="order-3 flex flex-col gap-1 sm:order-none">
        <div className="flex flex-nowrap items-center justify-between gap-2 sm:justify-start">
          {showPresence ? (
            <span className="text-[13px] text-fg2">
              {presencePending
                ? 'Saving presence…'
                : readOnly
                  ? present
                    ? 'Present'
                    : 'Away'
                  : 'Present'}
            </span>
          ) : null}
          {onStepDown ? (
            <Button size="xs" aria-label={`Move ${name} to the waitlist`} onClick={onStepDown}>
              Move to waitlist
            </Button>
          ) : null}
          {!readOnly ? (
            <>
              {showPresence ? (
                <Switch
                  checked={present}
                  onChange={onPresentChange}
                  aria-label={`${name} present`}
                />
              ) : null}
              {!levelLocked ? (
                <IconButton
                  size="xs"
                  variant="ghost"
                  label={`Remove ${name} from roster`}
                  onClick={onRemove}
                >
                  <Icon name="x" />
                </IconButton>
              ) : null}
            </>
          ) : null}
        </div>
        {present && selfCheckedInAt != null ? (
          <span className="inline-flex items-center gap-1 text-xs text-fg2">
            <Icon name="check" size={13} />
            Checked in themselves ·{' '}
            {new Date(selfCheckedInAt).toLocaleTimeString([], {
              hour: 'numeric',
              minute: '2-digit',
            })}
          </span>
        ) : !present && leftAt != null ? (
          <span className="text-xs text-fg2">
            Left · {new Date(leftAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
          </span>
        ) : null}
      </div>
    </div>
  )
}
