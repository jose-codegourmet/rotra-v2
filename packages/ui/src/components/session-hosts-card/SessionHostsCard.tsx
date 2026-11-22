'use client'

import { Avatar } from '@rotra/ui/avatar'
import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
import { Chip } from '@rotra/ui/chip'
import { type HostCandidate, HostPickerSheet } from '@rotra/ui/host-picker-sheet'
import { Icon } from '@rotra/ui/icon'
import { ListRow } from '@rotra/ui/list-row'
import { useId, useState } from 'react'

/** One current host of the session, joined to the saved player. */
export type SessionHostRow = {
  /** The saved player (club player) id */
  clubPlayerId: string
  name: string
  photoUrl?: string
  /** Where their player registration stands: a slot, the waitlist, or neither (withdrawn) */
  registration: 'slot' | 'waitlist' | null
}

export type SessionHostsCardProps = {
  hosts: SessionHostRow[]
  /** The club's saved players who are not hosts of this session yet (trusted hosts first) */
  candidates: HostCandidate[]
  /** Slots still open now; a new host who is not in yet takes one, else goes on the waitlist */
  openSlots: number
  /** The session is running (changes the note only) */
  live?: boolean
  /** A trusted host was picked */
  onAdd: (clubPlayerId: string) => void
  /** A non-trusted saved player was confirmed: the container trusts them, then adds them */
  onAddNew: (clubPlayerId: string) => void
  onRemove: (clubPlayerId: string) => void
  /** A host change is saving */
  isPending?: boolean
  /** Controlled Add host sheet; omit to let the card keep it */
  addOpen?: boolean
  onAddOpenChange?: (open: boolean) => void
  className?: string
}

const REGISTRATION = {
  slot: 'Playing · has a slot',
  waitlist: 'On the waitlist',
} as const

/**
 * Session management › Hosts (#1005, D-2026-11-22-01): the compact Hosts card of Q-PREPARE (before
 * and during the session). Add host reuses HostPickerSheet; Remove ends the host designation only.
 * Players stay on the roster or waitlist when their designation ends, and withdrawing never removes
 * it. Hosting is shown on the session, never a sign-in. It only reports; the container saves and
 * toasts.
 */
export function SessionHostsCard({
  hosts,
  candidates,
  openSlots,
  live = false,
  onAdd,
  onAddNew,
  onRemove,
  isPending = false,
  addOpen,
  onAddOpenChange,
  className,
}: SessionHostsCardProps) {
  const id = useId()
  const [addState, setAddState] = useState(false)
  const open = addOpen ?? addState
  const setOpen = (next: boolean) => {
    setAddState(next)
    onAddOpenChange?.(next)
  }

  return (
    <Card asChild className={className}>
      <section aria-labelledby={`${id}-h`} className="flex min-w-0 flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <h3 id={`${id}-h`}>Hosts{hosts.length ? ` · ${hosts.length}` : ''}</h3>
          <Button
            size="sm"
            disabled={!candidates.length || isPending}
            onClick={() => setOpen(true)}
          >
            <Icon name="plus" size={16} />
            Add host
          </Button>
        </div>
        {hosts.length ? (
          <div className="flex flex-col divide-y divide-border">
            {hosts.map((h) => (
              <ListRow
                key={h.clubPlayerId}
                leading={<Avatar name={h.name} src={h.photoUrl} />}
                title={h.name}
                subtitle={h.registration ? REGISTRATION[h.registration] : 'Not on the roster'}
                trailing={
                  <>
                    <Chip tone="accent">Host</Chip>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={isPending}
                      aria-label={`Remove ${h.name} as a host`}
                      onClick={() => onRemove(h.clubPlayerId)}
                    >
                      Remove
                    </Button>
                  </>
                }
              />
            ))}
          </div>
        ) : (
          <p className="m-0 text-[13px] text-fg2">
            No hosts. Add your trusted hosts, or anyone from your saved players.
          </p>
        )}
        <span className="text-xs text-fg2">
          {openSlots
            ? `${openSlots} slot${openSlots === 1 ? '' : 's'} open. A new host takes one unless they're already in.`
            : "Every slot is taken. A new host who isn't in yet goes on the waitlist."}{' '}
          Removing a host keeps their player place
          {live ? '' : ', and withdrawing keeps the host designation'}. Hosting doesn't let anyone
          sign in to Queue.
        </span>
        <HostPickerSheet
          open={open}
          onOpenChange={setOpen}
          candidates={candidates}
          isPending={isPending}
          onPick={onAdd}
          onPickNew={onAddNew}
        />
      </section>
    </Card>
  )
}
