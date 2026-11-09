'use client'

import { Avatar } from '@rotra/ui/avatar'
import { Button } from '@rotra/ui/button'
import { EmptyState } from '@rotra/ui/empty-state'
import { Field } from '@rotra/ui/field'
import { IdentityChip } from '@rotra/ui/identity-chip'
import type { Identity } from '@rotra/ui/identity-chip/variants'
import { Sheet } from '@rotra/ui/sheet'
import { TextInput } from '@rotra/ui/text-input'
import { useState } from 'react'

/** One saved player the guest can be linked to. */
export type LinkSavedPlayerCandidate = {
  /** The club player id: what onChoose reports */
  id: string
  name: string
  nickname: string | null
  photoUrl?: string
  /** The RTR ID; null for guests and unclaimed profiles (the row says "Guest") */
  rtrId: string | null
  identity: Identity
}

export type LinkSavedPlayerSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The guest being linked: "Link NAME to a saved player" */
  guestName: string
  /** Saved players other than the guest, in the order to show (the prototype sorts by name) */
  players: LinkSavedPlayerCandidate[]
  /** Opening search text */
  initialQuery?: string
  /** Reports the pick only; the merge and its toast belong to the caller */
  onChoose: (playerId: string) => void
  /** "Back": returns to the guest's profile */
  onBack: () => void
}

/**
 * "Link NAME to a saved player": the Queue Master links a guest record to the saved player who is the
 * same person. Search by name, nickname or RTR ID; picking one reports it and nothing merges here.
 */
export function LinkSavedPlayerSheet({
  open,
  onOpenChange,
  guestName,
  players,
  initialQuery = '',
  onChoose,
  onBack,
}: LinkSavedPlayerSheetProps) {
  const [query, setQuery] = useState(initialQuery)
  const q = query.trim().toLowerCase()
  const list = players.filter(
    (p) =>
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.nickname?.toLowerCase().includes(q) ||
      p.rtrId?.toLowerCase().includes(q),
  )
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={`Link ${guestName} to a saved player`}
      footer={<Button onClick={onBack}>Back</Button>}
    >
      <p className="m-0 text-[13px] text-fg2">
        Choose the saved player who is the same person. {guestName}'s slots, games and payments here
        move to that record. Nothing merges until you pick one.
      </p>
      <Field label="Search saved players">
        <TextInput
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Name, nickname or RTR ID"
          autoComplete="off"
          autoFocus
        />
      </Field>
      <div className="flex max-h-80 flex-col gap-1.5 overflow-y-auto">
        {list.length ? (
          list.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onChoose(p.id)}
              className="flex w-full min-w-0 items-center gap-2.5 rounded-md border border-border-strong bg-bg px-3 py-2.5 text-left text-fg hover:bg-elev"
            >
              <Avatar name={p.name} src={p.photoUrl} size={40} />
              <span className="flex min-w-0 flex-1 flex-col">
                <b className="[overflow-wrap:anywhere]">{p.name}</b>
                <span className="text-[13px] text-fg2 [overflow-wrap:anywhere]">
                  {p.rtrId ?? 'Guest'}
                </span>
              </span>
              <IdentityChip identity={p.identity} />
            </button>
          ))
        ) : (
          <EmptyState>No saved player matches.</EmptyState>
        )}
      </div>
    </Sheet>
  )
}
