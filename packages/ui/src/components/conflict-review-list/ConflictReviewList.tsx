'use client'

import type { SyncConflict } from '@rotra/data/sync/types'
import { ConflictItemCard } from '@rotra/ui/conflict-review-list/conflict-item-card'
import { Notice } from '@rotra/ui/notice'

export type ConflictReviewListProps = {
  conflicts: SyncConflict[]
  onSelectPlayer: (id: string) => void
  /** A change this device recorded that the server refused: drop it and keep the server's record */
  onKeepServer?: (id: string) => void
  /** Send that change again */
  onRetry?: (id: string) => void
  /** The conflict a decision is running for */
  pendingId?: string | null
}
export function ConflictReviewList({
  conflicts,
  onSelectPlayer,
  onKeepServer,
  onRetry,
  pendingId,
}: ConflictReviewListProps) {
  const refused = conflicts.some((c) => c.pending)
  return (
    <section className="flex min-w-0 flex-col gap-4">
      <h2 className="m-0 text-lg font-bold">Review original-device records</h2>
      {refused ? (
        <Notice tone="warn" title="Session done is blocked.">
          ROTRA has a different record from a change saved on this device. Keep the server's
          version, or try the change again. Confirmed winners cannot be edited here.
        </Notice>
      ) : (
        <Notice tone="warn" title="Session done is blocked.">
          These confirmed records disagree. Resolution needs a supported reconciliation rule before
          Session done can continue. Confirmed winners cannot be edited here.
        </Notice>
      )}
      {conflicts.map((conflict) => (
        <ConflictItemCard
          key={conflict.id}
          conflict={conflict}
          onSelectPlayer={onSelectPlayer}
          onKeepServer={onKeepServer}
          onRetry={onRetry}
          isPending={pendingId === conflict.id}
        />
      ))}
    </section>
  )
}
