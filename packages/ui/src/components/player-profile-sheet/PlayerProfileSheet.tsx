'use client'

import type { PlayingLevel } from '@rotra/data/player/types'
import { Avatar } from '@rotra/ui/avatar'
import { Button } from '@rotra/ui/button'
import { IdentityChip } from '@rotra/ui/identity-chip'
import type { Identity } from '@rotra/ui/identity-chip/variants'
import { KeyValueList } from '@rotra/ui/key-value-list'
import { levelLabel } from '@rotra/ui/level-pill'
import { Sheet } from '@rotra/ui/sheet'

export type PlayerProfileSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  name: string
  photoUrl?: string
  identity: Identity
  nickname: string | null
  /** The club's level suggestion for this player */
  level: PlayingLevel | null
  /** City the profile was first registered in (from the RTR ID) */
  registeredCity: string | null
  rtrId: string | null
  /** Long date the club saved them, e.g. "October 3, 2026" */
  addedLabel: string
  sessionsHere: number
  /** The player hid their phone. The number itself is never passed to this component */
  phoneHidden: boolean
  /** Opened from a dialog: the footer offers Back to that dialog instead of Close */
  backLabel?: 'suggestion' | 'match' | 'payments'
  onBack?: () => void
  /** Shown for guests and unclaimed profiles */
  onInvite?: () => void
}

const STATUS: Record<Identity, string> = {
  registered: 'Registered ROTRA player',
  unclaimed: 'Profile exists but not claimed yet',
  guest: 'Guest, no ROTRA profile',
  pending: 'Profile lookup after the session syncs',
}

/** A player's profile on operator screens, opened from any player picture. Never shows a phone number. */
export function PlayerProfileSheet({
  open,
  onOpenChange,
  name,
  photoUrl,
  identity,
  nickname,
  level,
  registeredCity,
  rtrId,
  addedLabel,
  sessionsHere,
  phoneHidden,
  backLabel,
  onBack,
  onInvite,
}: PlayerProfileSheetProps) {
  const canInvite = identity === 'guest' || identity === 'unclaimed'
  const phone = phoneHidden
    ? 'Hidden by player'
    : identity === 'guest'
      ? 'None on file'
      : 'Kept private; confirmed in person when adding them to a session'
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={name}
      footer={
        <>
          {backLabel ? (
            <Button onClick={onBack}>Back to {backLabel}</Button>
          ) : (
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          )}
          {canInvite && onInvite ? (
            <Button variant="primary" onClick={onInvite}>
              Invite
            </Button>
          ) : null}
        </>
      }
    >
      <div className="flex min-w-0 items-center gap-3">
        <Avatar
          name={name}
          src={photoUrl}
          size={64}
          className={
            photoUrl
              ? 'shadow-[0_0_0_2px_var(--surface),0_0_0_3px_var(--border-strong)]'
              : undefined
          }
        />
        <div className="flex min-w-0 flex-col gap-1.5">
          <div>
            <IdentityChip identity={identity} />
          </div>
          <span className="text-[13px] text-fg2">{STATUS[identity]}</span>
        </div>
      </div>
      <KeyValueList
        items={[
          { label: 'Nickname', value: nickname || '—' },
          { label: 'Level suggestion', value: level ? levelLabel(level) : 'None yet' },
          { label: 'Registered in', value: registeredCity ?? 'Not registered yet' },
          {
            label: 'RTR ID',
            value: rtrId ? <span className="font-mono text-[13px]">{rtrId}</span> : 'None yet',
          },
          { label: 'Added to club', value: addedLabel },
          { label: 'Sessions here', value: sessionsHere },
          { label: 'Phone', value: phone },
        ]}
      />
      <p className="m-0 text-[13px] text-fg2">
        Levels are set per session while preparing a roster, not here.
      </p>
    </Sheet>
  )
}
