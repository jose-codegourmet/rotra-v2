'use client'

import { expectedGames } from '@rotra/data/queue-session/queueSession.rules'
import type { QueueSession } from '@rotra/data/queue-session/types'
import { ConfirmSheet } from '@rotra/ui/confirm-sheet'

/** What the Queue Master was about to do when the roster turned out to be full. */
export type OverfillTarget = { name: string }

export type OverfillConfirmProps = {
  /** The add or Give slot anyway waiting on the answer; null keeps the sheet closed */
  target: OverfillTarget | null
  session: Pick<
    QueueSession,
    'scheduledStartAt' | 'scheduledEndAt' | 'allowSingles' | 'allowDoubles'
  > & { courts: unknown[] }
  rosterCount: number
  capacity: number
  /** Cancel: back to the Add player sheet with the choice kept, or just closed for Give slot */
  onCancel: () => void
  /** Add player flows only: the player goes on the waitlist as before */
  onAddToWaitlist?: () => void
  onAddAnyway: () => void
}

/**
 * D-OVERFILL (#735): asked once when the roster is full and the Queue Master adds someone (Add
 * player, Add late player) or gives a slot anyway. “Add NAME anyway?”, the count, and how expected
 * games change for one more player (`expectedGames().low` now and after), then Cancel, Add to
 * waitlist (add flows only) and Add anyway.
 */
export function OverfillConfirm({
  target,
  session,
  rosterCount,
  capacity,
  onCancel,
  onAddToWaitlist,
  onAddAnyway,
}: OverfillConfirmProps) {
  const now = expectedGames(session, session.courts.length, rosterCount).low
  const after = expectedGames(session, session.courts.length, rosterCount + 1).low
  const name = target?.name ?? ''
  return (
    <ConfirmSheet
      open={target !== null}
      onOpenChange={(open) => {
        if (!open) onCancel()
      }}
      title={`Add ${name} anyway?`}
      consequence={`The roster is full (${rosterCount}/${capacity}). Add ${name} anyway?`}
      note={
        now > after
          ? `Expected games drop from ${now} to ${after}.`
          : `Expected games stay at ${now}.`
      }
      backLabel="Cancel"
      onBack={onCancel}
      extraAction={
        onAddToWaitlist ? { label: 'Add to waitlist', onClick: onAddToWaitlist } : undefined
      }
      confirmLabel="Add anyway"
      onConfirm={onAddAnyway}
    />
  )
}
