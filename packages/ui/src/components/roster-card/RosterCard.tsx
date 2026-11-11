'use client'

import type { PlayingLevel } from '@rotra/data/player/types'
import { Avatar } from '@rotra/ui/avatar'
import { Button } from '@rotra/ui/button'
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

/** The level block in the skill group's color (the prototype's .rv-lv): outline plus a 12% tint. */
const LEVEL_BLOCK = {
  beginner: 'border-lv-beg bg-[color-mix(in_srgb,var(--lv-beg)_12%,transparent)]',
  intermediate: 'border-lv-int bg-[color-mix(in_srgb,var(--lv-int)_12%,transparent)]',
  advanced: 'border-lv-adv bg-[color-mix(in_srgb,var(--lv-adv)_12%,transparent)]',
  none: 'border-border',
} as const

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
  selfCheckedInAt?: number | null
  leftAt?: number | null
  /** Whether this player has a payment mark for the session */
  paid?: boolean
  /** Levels lock when the session starts: "LEVEL · Fixed after start", no select */
  levelLocked?: boolean
  /** Settings summary: presence is text and removal is unavailable. */
  readOnly?: boolean
  /** False before Start session: no Present band or switch (presence shows once the session has started) */
  showPresence?: boolean
  onOpenProfile: () => void
  onLevelChange: (level: PlayingLevel) => void
  onPresentChange: (present: boolean) => void
  onRemove: () => void
  /**
   * Move to waitlist (#735): a secondary button on the card's last row, before and after Start
   * (also in the read-only summary). Omit to hide it.
   */
  onStepDown?: () => void
  className?: string
}

/**
 * One confirmed slot on the preparation roster grid (the prototype's .rv-card). First level:
 * picture, name, remove, a full-width Present band (accent tint when present) and a level block
 * tinted in the skill group's color (level select or "LEVEL · Fixed after start", plus the
 * suggestion indicator). Second level: one small muted line with the identity chip, Paid / Not
 * paid and "Suggestion: LEVEL". Last, Move to waitlist when `onStepDown` is given (#735).
 */
export function RosterCard({
  name,
  photoUrl,
  identity,
  suggestion,
  level,
  present,
  presencePending = false,
  selfCheckedInAt,
  leftAt,
  paid = false,
  levelLocked,
  readOnly = false,
  showPresence = true,
  onOpenProfile,
  onLevelChange,
  onPresentChange,
  onRemove,
  onStepDown,
  className,
}: RosterCardProps) {
  const diffId = useId()
  const afterStart = Boolean(levelLocked || readOnly)
  const band = level ? (level.split('_')[0] as 'beginner' | 'intermediate' | 'advanced') : 'none'
  return (
    <Card asChild padding="none" className={cn('flex flex-col gap-2 p-3 shadow-card', className)}>
      <article aria-label={name}>
        <div className="flex min-w-0 items-start gap-2.5">
          <Avatar name={name} src={photoUrl} onClick={onOpenProfile} />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <b className="font-semibold [overflow-wrap:anywhere]">{name}</b>
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
        {showPresence ? (
          <div
            className={cn(
              'flex items-center justify-between gap-2 rounded-md px-2.5 py-2',
              present ? 'bg-accent-subtle text-accent' : 'bg-elev text-fg2',
            )}
          >
            {afterStart ? (
              <span className="text-sm font-semibold">
                {presencePending ? 'Saving presence…' : present ? 'Present' : 'Away'}
              </span>
            ) : (
              <>
                <span className="text-sm font-semibold">
                  {presencePending ? 'Saving presence…' : present ? 'Present' : 'Not present'}
                </span>
                <Switch
                  checked={present}
                  onChange={onPresentChange}
                  aria-label={`${name} present`}
                />
              </>
            )}
          </div>
        ) : null}
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
        <div
          className={cn(
            'flex min-w-0 flex-col gap-1 rounded-md border px-2.5 py-2',
            LEVEL_BLOCK[band],
          )}
        >
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
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-fg2">
          <IdentityChip identity={identity} />
          <span className="inline-flex items-center gap-1">
            {paid ? <Icon name="check" size={13} /> : null}
            {paid ? 'Paid' : 'Not paid'}
          </span>
          <span>{suggestion ? `Suggestion: ${levelLabel(suggestion)}` : 'No suggestion'}</span>
        </div>
        {onStepDown ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button size="xs" aria-label={`Move ${name} to the waitlist`} onClick={onStepDown}>
              Move to waitlist
            </Button>
          </div>
        ) : null}
      </article>
    </Card>
  )
}
