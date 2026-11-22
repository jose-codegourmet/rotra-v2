'use client'

import type { ClubPlayer } from '@rotra/data/club-player/types'
import { Avatar } from '@rotra/ui/avatar'
import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
import { ConfirmSheet } from '@rotra/ui/confirm-sheet'
import { IdentityChip } from '@rotra/ui/identity-chip'
import { ListRow } from '@rotra/ui/list-row'
import { Sheet } from '@rotra/ui/sheet'
import { TextInput } from '@rotra/ui/text-input'
import { useId, useState } from 'react'

/** A saved player as the Trusted hosts section and its Add sheet show them. */
export type TrustedHostPerson = {
  /** The saved player (club player) id */
  clubPlayerId: string
  name: string
  nickname?: string | null
  /** A registered player's club nickname; searched like the nickname */
  clubNickname?: string | null
  /** What the Remove confirmation calls them (club nickname, nickname or first name) */
  shortName?: string
  photoUrl?: string
  identity: ClubPlayer['identity']
  detailsRequired?: boolean
}

export type TrustedHostRow = TrustedHostPerson & {
  /** "Trusted since Oct 13" */
  sinceLabel: string
}

export type TrustedHostsPanelProps = {
  /** The club's current trusted hosts, in list order (oldest first) */
  hosts: TrustedHostRow[]
  /** Saved players not on the list yet; the Add sheet sorts them by name */
  candidates: TrustedHostPerson[]
  onAdd: (clubPlayerId: string) => void
  /** Called after the user confirmed Remove host */
  onRemove: (clubPlayerId: string) => void
  isPending?: boolean
  /** Controlled Add trusted host sheet; omit to let the panel keep it */
  addOpen?: boolean
  onAddOpenChange?: (open: boolean) => void
  className?: string
}

const matches = (p: TrustedHostPerson, q: string) =>
  !q ||
  p.name.toLowerCase().includes(q) ||
  Boolean(p.nickname?.toLowerCase().includes(q)) ||
  Boolean(p.clubNickname?.toLowerCase().includes(q))

/**
 * Club settings › Trusted hosts (D-2026-11-22-01): the club's trusted-host list drawn from its saved
 * players, an Add trusted host sheet that picks from saved players not on it, and the Remove host
 * confirmation. Informational only: it changes the list and nothing else. It only reports; toasts
 * and saving live in the container.
 */
export function TrustedHostsPanel({
  hosts,
  candidates,
  onAdd,
  onRemove,
  isPending = false,
  addOpen,
  onAddOpenChange,
  className,
}: TrustedHostsPanelProps) {
  const id = useId()
  const [addState, setAddState] = useState(false)
  const open = addOpen ?? addState
  const setOpen = (next: boolean) => {
    setAddState(next)
    onAddOpenChange?.(next)
    if (!next) setQuery('')
  }
  const [query, setQuery] = useState('')
  const [removing, setRemoving] = useState<TrustedHostRow | null>(null)
  const q = query.trim().toLowerCase()
  const list = candidates.filter((p) => matches(p, q)).sort((a, b) => a.name.localeCompare(b.name))

  return (
    <Card asChild className={className}>
      <section id="club-hosts" aria-labelledby={`${id}-h`} className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h2 id={`${id}-h`}>Trusted hosts</h2>
            <p className="m-0 text-[13px] text-fg2">
              Saved players your club trusts to host its sessions. When you create a session,
              they're listed first in the host picker. Hosting is shown on the session; it doesn't
              let them sign in to Queue.
            </p>
          </div>
          <Button
            size="sm"
            variant="primary"
            disabled={!candidates.length || isPending}
            onClick={() => setOpen(true)}
          >
            Add trusted host
          </Button>
        </div>
        {hosts.length ? (
          <div className="flex flex-col divide-y divide-border">
            {hosts.map((h) => (
              <ListRow
                key={h.clubPlayerId}
                leading={<Avatar name={h.name} src={h.photoUrl} />}
                title={h.name}
                subtitle={h.sinceLabel}
                trailing={
                  <>
                    <IdentityChip identity={h.identity} detailsRequired={h.detailsRequired} />
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={isPending}
                      aria-label={`Remove ${h.name} from trusted hosts`}
                      onClick={() => setRemoving(h)}
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
            No trusted hosts yet. Add saved players you trust to host your sessions.
          </p>
        )}
        <p className="m-0 text-[13px] text-fg2">
          Removing a trusted host keeps them in your saved players, and sessions they already hosted
          still show them.
        </p>
        <Sheet
          open={open}
          onOpenChange={setOpen}
          title="Add trusted host"
          footer={<Button onClick={() => setOpen(false)}>Done</Button>}
        >
          <p className="m-0 text-[13px] text-fg2">
            Pick a saved player your club trusts to host its sessions.
          </p>
          <TextInput
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search saved players by name"
            aria-label="Search saved players"
            autoComplete="off"
          />
          {list.length ? (
            <div className="flex flex-col divide-y divide-border">
              {list.map((p) => (
                <ListRow
                  key={p.clubPlayerId}
                  leading={<Avatar name={p.name} src={p.photoUrl} />}
                  title={p.name}
                  subtitle={p.nickname ? `“${p.nickname}”` : undefined}
                  trailing={
                    <>
                      <IdentityChip identity={p.identity} detailsRequired={p.detailsRequired} />
                      <Button
                        size="sm"
                        disabled={isPending}
                        aria-label={`Add ${p.name} as a trusted host`}
                        onClick={() => {
                          setOpen(false)
                          onAdd(p.clubPlayerId)
                        }}
                      >
                        Add
                      </Button>
                    </>
                  }
                />
              ))}
            </div>
          ) : (
            <p className="m-0 text-[13px] text-fg2">No saved player matches.</p>
          )}
        </Sheet>
        <ConfirmSheet
          open={removing !== null}
          onOpenChange={(next) => {
            if (!next) setRemoving(null)
          }}
          title={removing ? `Remove ${removing.name} from trusted hosts?` : ''}
          consequence={
            removing
              ? `${removing.shortName ?? removing.name.split(' ')[0]} stays in your saved players. Sessions they already hosted still show them as a host.`
              : ''
          }
          note={
            removing
              ? `They won't be listed first in the host picker any more${removing.identity === 'registered' ? ', and their ROTRA profile stops showing the Host badge for your club' : ''}.`
              : undefined
          }
          backLabel="Keep host"
          confirmLabel="Remove host"
          destructive
          onConfirm={() => {
            const target = removing
            setRemoving(null)
            if (target) onRemove(target.clubPlayerId)
          }}
        />
      </section>
    </Card>
  )
}
