'use client'

import { ConfirmSheet } from '@rotra/ui/confirm-sheet'
import { KeyValueList } from '@rotra/ui/key-value-list'
import { Notice } from '@rotra/ui/notice'

export type DeleteSessionSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  /** "Thu, Oct 28 · 7:00 PM–10:00 PM" */
  whenLabel: string
  venueName: string
  /** Players holding a slot. Any confirmed player blocks the delete. */
  confirmedCount: number
  waitlistCount: number
  pendingRequestCount: number
  offline?: boolean
  isPending?: boolean
  /** The delete was refused (a player was confirmed meanwhile, offline, a save failure) */
  error?: string
  onConfirm: () => void
  /** Blocked variant: takes the Queue Master to the roster to remove players */
  onOpenRoster: () => void
}

const players = (n: number) => `${n} ${n === 1 ? 'player' : 'players'}`

/**
 * D-DELETE-SESSION: deletes a prepared session. With nobody confirmed it asks for a destructive
 * Delete session; once players are confirmed it explains why it cannot delete and offers the roster.
 */
export function DeleteSessionSheet({
  open,
  onOpenChange,
  title,
  whenLabel,
  venueName,
  confirmedCount,
  waitlistCount,
  pendingRequestCount,
  offline,
  isPending,
  error,
  onConfirm,
  onOpenRoster,
}: DeleteSessionSheetProps) {
  const summary = (
    <KeyValueList
      items={[
        { label: 'Session', value: title },
        { label: 'When', value: whenLabel },
        { label: 'Venue', value: venueName },
        {
          label: 'Roster',
          value: `${confirmedCount} confirmed${waitlistCount ? ` · ${waitlistCount} on the waitlist` : ''}${pendingRequestCount ? ` · ${pendingRequestCount} join ${pendingRequestCount === 1 ? 'request' : 'requests'}` : ''}`,
        },
      ]}
    />
  )

  if (confirmedCount > 0)
    return (
      <ConfirmSheet
        open={open}
        onOpenChange={onOpenChange}
        title="Can't delete this session"
        summary={summary}
        consequence={`${players(confirmedCount)} ${confirmedCount === 1 ? 'is' : 'are'} confirmed for this session. Remove every confirmed player from the roster first, then delete the session.`}
        confirmLabel="Open roster"
        backLabel="Back"
        onConfirm={onOpenRoster}
      />
    )

  return (
    <ConfirmSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Delete session?"
      summary={
        <>
          {summary}
          {offline ? (
            <Notice tone="offline">You're offline. Connect to delete this session.</Notice>
          ) : null}
        </>
      }
      consequence="The session, its public link, its waitlist and any join requests are removed. This cannot be undone."
      confirmLabel="Delete session"
      backLabel="Keep session"
      destructive
      confirmDisabled={offline}
      isPending={isPending}
      error={error}
      onConfirm={onConfirm}
    />
  )
}
