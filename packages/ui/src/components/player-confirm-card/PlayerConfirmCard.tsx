'use client'

import type { PlayingLevel } from '@rotra/data/player/types'
import { Avatar } from '@rotra/ui/avatar'
import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
import { cn } from '@rotra/ui/cn'
import { Field } from '@rotra/ui/field'
import { IdentityChip } from '@rotra/ui/identity-chip'
import type { Identity } from '@rotra/ui/identity-chip/variants'
import { LevelSelect, levelLabel } from '@rotra/ui/level-select'

export type PlayerConfirmCardProps = {
  name: string
  photoUrl?: string
  /**
   * Shown in monospace; null shows "Not registered yet" for an unclaimed profile (its RTR ID is
   * given when they register) and "Guest" otherwise
   */
  rtrId: string | null
  identity: Identity
  /** The player chose to hide their phone from clubs: "Phone hidden by player. …" */
  phoneHidden?: boolean
  /** Player Information suggestion; null shows "None yet" */
  suggestion: PlayingLevel | null
  /** Level for this club, preset to the suggestion by the sheet */
  level: PlayingLevel | null
  onLevelChange: (level: PlayingLevel) => void
  /** The session is live: the level label says it locks immediately */
  live?: boolean
  /** "Choose a level for this club before adding." or the server's refusal */
  error?: string
  /** Every slot is taken: the primary reads "Add to waitlist" */
  full?: boolean
  /**
   * `club`: saving to the saved players with no session (Saved players › Add player). The level is
   * optional and the primary reads "Save player".
   */
  context?: 'session' | 'club'
  /** With onConfirm, draws Back and the primary under the card (the sheet draws its own footer instead) */
  onBack?: () => void
  onConfirm?: () => void
  isPending?: boolean
  className?: string
}

/**
 * Q-ASSESS: the picked player's identity, the Player Information suggestion and the level for this
 * club. There is no identity check (owner, November 11, 2026: unclaimed profiles are the club's own
 * records). Never shows a phone number; a hidden phone only says so.
 */
export function PlayerConfirmCard({
  name,
  photoUrl,
  rtrId,
  identity,
  phoneHidden = false,
  suggestion,
  level,
  onLevelChange,
  live = false,
  error,
  full = false,
  context = 'session',
  onBack,
  onConfirm,
  isPending = false,
  className,
}: PlayerConfirmCardProps) {
  const club = context === 'club'
  const levelMissing = Boolean(error) && level == null

  return (
    <div className={cn('flex flex-col gap-3.5', className)}>
      <Card className="flex flex-col gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={name} src={photoUrl} />
          <span className="flex min-w-0 flex-1 flex-col">
            <b className="[overflow-wrap:anywhere]">{name}</b>
            <span className="text-[13px] text-fg2">
              {rtrId ? (
                <span className="font-mono text-[0.92em]">{rtrId}</span>
              ) : identity === 'unclaimed' ? (
                'Not registered yet'
              ) : (
                'Guest'
              )}
            </span>
          </span>
          <IdentityChip identity={identity} />
        </div>

        {phoneHidden ? (
          <p className="m-0 text-[13px] text-fg2">
            Phone hidden by player. Use their RTR ID or QR code instead.
          </p>
        ) : null}

        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="text-[13px] font-semibold text-fg2">Player Information suggestion</span>
          <span className="text-[13px]">{suggestion ? levelLabel(suggestion) : 'None yet'}</span>
        </div>

        <Field
          label={`Level for this club${!club && live ? ' (locks immediately)' : ''}`}
          optional={club}
          error={error}
        >
          <LevelSelect
            value={level}
            onChange={onLevelChange}
            missing={levelMissing}
            disabled={isPending}
          />
        </Field>
      </Card>

      {onConfirm ? (
        <div className="flex flex-wrap justify-end gap-2.5 [&>*]:flex-auto">
          <Button disabled={isPending} onClick={onBack}>
            Back
          </Button>
          <Button variant="primary" loading={isPending} onClick={onConfirm}>
            {club ? 'Save player' : full && !live ? 'Add to waitlist' : 'Confirm player slot'}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
