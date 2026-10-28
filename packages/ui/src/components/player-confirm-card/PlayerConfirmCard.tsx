'use client'

import type { PlayingLevel } from '@rotra/data/player/types'
import type { IdentityCheck } from '@rotra/data/session-roster/types'
import { Avatar } from '@rotra/ui/avatar'
import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
import { cn } from '@rotra/ui/cn'
import { Field } from '@rotra/ui/field'
import { Icon } from '@rotra/ui/icon'
import { IdentityChip } from '@rotra/ui/identity-chip'
import type { Identity } from '@rotra/ui/identity-chip/variants'
import { LevelSelect, levelLabel } from '@rotra/ui/level-select'

export type PlayerConfirmCardProps = {
  name: string
  photoUrl?: string
  /** Shown in monospace; null shows "Guest · no RTR ID" */
  rtrId: string | null
  identity: Identity
  /** The player chose to hide their phone from clubs: the Phone confirmed check is left out */
  phoneHidden?: boolean
  /** Player Information suggestion; null shows "None yet" */
  suggestion: PlayingLevel | null
  /** Level for this club, preset to the suggestion by the sheet */
  level: PlayingLevel | null
  onLevelChange: (level: PlayingLevel) => void
  /** The identity check chosen for an unclaimed profile; null until one is tapped */
  check?: IdentityCheck | null
  onCheckChange?: (check: IdentityCheck | null) => void
  /** The session is live: the level label says it locks immediately */
  live?: boolean
  /** "Choose a level for this club before adding." or the server's refusal */
  error?: string
  /** Every slot is taken: the primary reads "Add to waitlist" */
  full?: boolean
  /** With onConfirm, draws Back and the primary under the card (the sheet draws its own footer instead) */
  onBack?: () => void
  onConfirm?: () => void
  isPending?: boolean
  className?: string
}

const CHECKS: { value: IdentityCheck; label: string }[] = [
  { value: 'rtr-id', label: 'RTR ID matches' },
  { value: 'qr', label: 'Scanned their QR' },
  { value: 'phone', label: 'Phone confirmed' },
]

/** Only unclaimed profiles need the in-person identity check; the primary waits for one. */
export function needsIdentityCheck(identity: Identity) {
  return identity === 'unclaimed'
}

/** True once the card can be confirmed: a check is chosen for an unclaimed profile, nothing else needed. */
export function canConfirmPlayer(identity: Identity, check: IdentityCheck | null | undefined) {
  return !needsIdentityCheck(identity) || check != null
}

/**
 * Q-IDENTIFY / Q-ASSESS: the picked player's identity, the identity check that only unclaimed
 * profiles need, the Player Information suggestion and the level for this club. Never shows a phone
 * number; a hidden phone only says so.
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
  check = null,
  onCheckChange,
  live = false,
  error,
  full = false,
  onBack,
  onConfirm,
  isPending = false,
  className,
}: PlayerConfirmCardProps) {
  const needsCheck = needsIdentityCheck(identity)
  const checks = CHECKS.filter((c) => c.value !== 'phone' || !phoneHidden)
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
              ) : (
                'Guest · no RTR ID'
              )}
            </span>
          </span>
          <IdentityChip identity={identity} />
        </div>

        {needsCheck ? (
          <fieldset className="m-0 flex min-w-0 flex-col gap-1.5 border-0 p-0">
            <legend className="mb-1.5 p-0 text-xs font-semibold tracking-[0.5px] text-fg2 uppercase">
              Confirm this is the right person
            </legend>
            <p className="m-0 text-[13px]">
              Check with the player using one of these. A name match alone isn't enough.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {checks.map((c) => (
                <Button
                  key={c.value}
                  size="xs"
                  aria-pressed={check === c.value}
                  onClick={() => onCheckChange?.(check === c.value ? null : c.value)}
                >
                  {c.label}
                </Button>
              ))}
            </div>
            {check ? (
              <p
                role="status"
                className="m-0 inline-flex items-center gap-1.5 text-[13px] font-semibold text-accent"
              >
                <Icon name="check" size={14} />
                Identity confirmed with the player
              </p>
            ) : null}
          </fieldset>
        ) : null}

        {phoneHidden ? (
          <p className="m-0 text-[13px] text-fg2">
            Phone hidden by player. Use their RTR ID or QR code instead.
          </p>
        ) : null}

        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="text-[13px] font-semibold text-fg2">Player Information suggestion</span>
          <span className="text-[13px]">{suggestion ? levelLabel(suggestion) : 'None yet'}</span>
        </div>

        <Field label={`Level for this club${live ? ' (locks immediately)' : ''}`} error={error}>
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
          <Button
            variant="primary"
            loading={isPending}
            disabled={!canConfirmPlayer(identity, check)}
            onClick={onConfirm}
          >
            {full ? 'Add to waitlist' : 'Confirm player slot'}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
