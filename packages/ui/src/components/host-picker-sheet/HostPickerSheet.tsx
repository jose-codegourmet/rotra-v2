'use client'

import type { ClubPlayer } from '@rotra/data/club-player/types'
import { Avatar } from '@rotra/ui/avatar'
import { Button } from '@rotra/ui/button'
import { Chip } from '@rotra/ui/chip'
import { ConfirmSheet } from '@rotra/ui/confirm-sheet'
import { IdentityChip } from '@rotra/ui/identity-chip'
import { ListRow } from '@rotra/ui/list-row'
import { Sheet } from '@rotra/ui/sheet'
import { TextInput } from '@rotra/ui/text-input'
import { useState } from 'react'

/** A saved player as the host picker lists them. */
export type HostCandidate = {
  /** The saved player (club player) id */
  clubPlayerId: string
  name: string
  nickname?: string | null
  /** A registered player's club nickname; searched like the nickname */
  clubNickname?: string | null
  /** What the trusted-host confirmation calls them (club nickname, nickname or first name) */
  shortName?: string
  photoUrl?: string
  identity: ClubPlayer['identity']
  detailsRequired?: boolean
  /** On the club's trusted-host list */
  trusted: boolean
}

export type HostPickerSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /**
   * The club's current saved players not picked yet. Trusted hosts come first, in the order given
   * (the trusted-host list order); the others are sorted by name.
   */
  candidates: HostCandidate[]
  /** A trusted host was picked */
  onPick: (clubPlayerId: string) => void
  /** A saved player not on the trusted-host list was picked and the confirmation accepted */
  onPickNew: (clubPlayerId: string) => void
  /** Adding to the trusted-host list is saving */
  isPending?: boolean
}

const matches = (p: HostCandidate, q: string) =>
  !q ||
  p.name.toLowerCase().includes(q) ||
  Boolean(p.nickname?.toLowerCase().includes(q)) ||
  Boolean(p.clubNickname?.toLowerCase().includes(q))

/**
 * Q-SETUP › Hosts › Add host (#1004, D-2026-11-22-01): search the club's saved players, trusted
 * hosts first, then everyone else. Picking a saved player who is not a trusted host asks first,
 * because it permanently adds them to the club's trusted-host list. Hosting is shown on the session,
 * never a sign-in. It only reports; the container saves and toasts.
 */
export function HostPickerSheet({
  open,
  onOpenChange,
  candidates,
  onPick,
  onPickNew,
  isPending = false,
}: HostPickerSheetProps) {
  const [query, setQuery] = useState('')
  const [confirming, setConfirming] = useState<HostCandidate | null>(null)
  const q = query.trim().toLowerCase()
  const list = candidates.filter((p) => matches(p, q))
  const trusted = list.filter((p) => p.trusted)
  const others = list.filter((p) => !p.trusted).sort((a, b) => a.name.localeCompare(b.name))
  const anyTrusted = candidates.some((p) => p.trusted)
  const close = (next: boolean) => {
    onOpenChange(next)
    if (!next) setQuery('')
  }
  const row = (p: HostCandidate) => (
    <ListRow
      key={p.clubPlayerId}
      leading={<Avatar name={p.name} src={p.photoUrl} />}
      title={p.name}
      subtitle={p.nickname ? `“${p.nickname}”` : undefined}
      trailing={
        p.trusted ? (
          <Chip tone="accent">Trusted host</Chip>
        ) : (
          <IdentityChip identity={p.identity} detailsRequired={p.detailsRequired} />
        )
      }
      onClick={
        isPending
          ? undefined
          : () => {
              if (p.trusted) {
                close(false)
                onPick(p.clubPlayerId)
              } else setConfirming(p)
            }
      }
    />
  )
  const groupLabel = 'text-xs font-semibold tracking-[0.5px] text-fg2 uppercase'

  return (
    <>
      <Sheet
        open={open && confirming === null}
        onOpenChange={close}
        title="Add host"
        footer={<Button onClick={() => close(false)}>Done</Button>}
      >
        <TextInput
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search saved players by name"
          aria-label="Search saved players"
          autoComplete="off"
        />
        <div className="flex flex-col gap-1.5">
          <span className={groupLabel}>Trusted hosts</span>
          {trusted.length ? (
            <div className="flex flex-col divide-y divide-border">{trusted.map(row)}</div>
          ) : (
            <p className="m-0 text-[13px] text-fg2">
              {anyTrusted ? 'No trusted host left to pick.' : 'No trusted hosts yet.'}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <span className={groupLabel}>Other saved players</span>
          {others.length ? (
            <>
              <div className="flex flex-col divide-y divide-border">{others.map(row)}</div>
              <p className="m-0 text-[13px] text-fg2">
                Picking one asks first: it adds them to your club's trusted hosts.
              </p>
            </>
          ) : (
            <p className="m-0 text-[13px] text-fg2">No saved player matches.</p>
          )}
        </div>
      </Sheet>
      <ConfirmSheet
        open={open && confirming !== null}
        onOpenChange={(next) => {
          if (!next) setConfirming(null)
        }}
        title={confirming ? `Add ${confirming.name} as a trusted host?` : ''}
        consequence={
          confirming
            ? `This permanently adds ${confirming.shortName ?? confirming.name.split(' ')[0]} to your club's trusted hosts, so they're listed first in the host picker from now on. You can remove them later in Club settings › Trusted hosts.`
            : ''
        }
        note="They host this session and are registered as a player unless they're already in. Hosting doesn't let them sign in to Queue."
        backLabel="Back"
        onBack={() => setConfirming(null)}
        confirmLabel="Add trusted host"
        isPending={isPending}
        onConfirm={() => {
          const target = confirming
          setConfirming(null)
          if (target) {
            close(false)
            onPickNew(target.clubPlayerId)
          }
        }}
      />
    </>
  )
}
