'use client'

import { Avatar } from '@rotra/ui/avatar'
import { Button } from '@rotra/ui/button'
import { Chip } from '@rotra/ui/chip'
import { type HostCandidate, HostPickerSheet } from '@rotra/ui/host-picker-sheet'
import { Icon } from '@rotra/ui/icon'
import { ListRow } from '@rotra/ui/list-row'
import { Notice } from '@rotra/ui/notice'
import { useId, useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { slotBudget } from '../SessionSetupForm.helpers'
import type { SessionSetupInput } from '../SessionSetupForm.schema'

/** A saved player as Q-SETUP › Hosts knows them. */
export type SetupHostPerson = HostCandidate & {
  /** Already in this session (edit only): holds a slot or a waitlist place */
  registration?: 'slot' | 'waitlist' | null
}

/** The shared placement rule from @rotra/data (`hostPlacement`), passed in like the other rules. */
export type HostPlacementRule = (input: {
  capacity: number
  rosterCount: number
  needingPlace: number
}) => { slots: number; waitlisted: number }

export type SetupHostsSectionProps = {
  /** The club's current saved players; trusted hosts first, in trusted-host list order */
  people: SetupHostPerson[]
  /** Editing: the session's hosts as saved, so they need no new place */
  savedHostIds?: string[]
  /** Editing: players holding a slot now (0 for a new session) */
  rosterCount?: number
  /**
   * A non-trusted saved player was confirmed: the container adds them to the trusted-host list.
   * Resolves once added; the host is then picked. Rejects (and the container toasts) on failure.
   */
  onTrust: (clubPlayerId: string) => Promise<unknown>
  /** Adding to the trusted-host list is saving */
  isTrusting?: boolean
  placement: HostPlacementRule
  editing?: boolean
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

/**
 * Page 1 › Courts › Hosts (#1004, D-2026-11-22-01): the optional list of the session's hosts with
 * Add host (HostPickerSheet) and Remove. Each new host is registered as a player when the setup is
 * saved and takes one slot, unless already in; past the open slots they go on the waitlist (the
 * preparation rule), which the notice says before saving. Removing a host keeps their player place.
 */
export function SetupHostsSection({
  people,
  savedHostIds = [],
  rosterCount = 0,
  onTrust,
  isTrusting = false,
  placement,
  editing = false,
}: SetupHostsSectionProps) {
  const id = useId()
  const form = useFormContext<SessionSetupInput>()
  const ids = useWatch({ control: form.control, name: 'hostClubPlayerIds' }) ?? []
  const labels = useWatch({ control: form.control, name: 'courtLabels' })
  const perCourt = useWatch({ control: form.control, name: 'playersPerCourt' })
  const [picking, setPicking] = useState(false)
  const capacity = slotBudget({ courtLabels: labels, playersPerCourt: perCourt })
  const byId = new Map(people.map((p) => [p.clubPlayerId, p]))
  const fresh = ids.filter((h) => !savedHostIds.includes(h) && !byId.get(h)?.registration)
  const placed = placement({ capacity, rosterCount, needingPlace: fresh.length })
  const set = (next: string[]) => form.setValue('hostClubPlayerIds', next, { shouldDirty: true })
  const add = (clubPlayerId: string) => {
    const current = form.getValues('hostClubPlayerIds') ?? []
    if (!current.includes(clubPlayerId)) set([...current, clubPlayerId])
  }
  const subtitle = (h: string) => {
    const reg = byId.get(h)?.registration
    if (reg === 'slot') return 'Already has a slot'
    if (reg === 'waitlist') return 'Already on the waitlist'
    if (savedHostIds.includes(h)) return 'Hosting this session'
    return fresh.indexOf(h) < placed.slots ? 'Gets a player slot' : 'Goes on the waitlist'
  }
  const candidates = people.filter((p) => !ids.includes(p.clubPlayerId))
  const open = editing ? Math.max(0, capacity - rosterCount) : capacity

  return (
    <fieldset aria-labelledby={`${id}-h`} className="m-0 border-0 p-0 flex min-w-0 flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span id={`${id}-h`} className="text-[13px] font-semibold text-fg2">
          Hosts <span className="font-normal">· optional</span>
        </span>
        <Button size="sm" disabled={!candidates.length} onClick={() => setPicking(true)}>
          <Icon name="plus" size={16} />
          Add host
        </Button>
      </div>
      {ids.length ? (
        <div className="flex flex-col divide-y divide-border">
          {ids.map((h) => {
            const p = byId.get(h)
            const name = p?.name ?? 'Saved player'
            return (
              <ListRow
                key={h}
                leading={<Avatar name={name} src={p?.photoUrl} />}
                title={name}
                subtitle={subtitle(h)}
                trailing={
                  <>
                    <Chip tone="accent">Host</Chip>
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={`Remove ${name} as a host`}
                      onClick={() => set(ids.filter((x) => x !== h))}
                    >
                      Remove
                    </Button>
                  </>
                }
              />
            )
          })}
        </div>
      ) : (
        <p className="m-0 text-[13px] text-fg2">
          No hosts. Add your trusted hosts, or anyone from your saved players.
        </p>
      )}
      {fresh.length ? (
        placed.waitlisted ? (
          <Notice tone="warn" title={`Only ${plural(placed.slots, 'slot')} open.`}>
            The last {plural(placed.waitlisted, 'host')} {placed.waitlisted === 1 ? 'goes' : 'go'}{' '}
            on the waitlist when you save, like any player added to a full session.
          </Notice>
        ) : (
          <Notice
            tone="success"
            title={`${plural(fresh.length, 'host')} take${fresh.length === 1 ? 's' : ''} ${fresh.length} of ${editing ? `the ${open} open` : capacity} slot${(editing ? open : capacity) === 1 ? '' : 's'}.`}
          >
            Each host is registered as a player when you save.
          </Notice>
        )
      ) : null}
      <span className="text-xs text-fg2">
        Hosts are shown on the session. Each one is also registered as a player and takes one slot,
        unless they're already in. Hosting doesn't let anyone sign in to Queue.
        {editing ? ' Removing a host keeps their player slot.' : ''}
      </span>
      <HostPickerSheet
        open={picking}
        onOpenChange={setPicking}
        candidates={candidates}
        isPending={isTrusting}
        onPick={add}
        onPickNew={(clubPlayerId) => {
          onTrust(clubPlayerId).then(
            () => add(clubPlayerId),
            () => {},
          )
        }}
      />
    </fieldset>
  )
}
