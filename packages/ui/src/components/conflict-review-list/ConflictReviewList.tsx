'use client'

import type { SyncConflict } from '@rotra/data/sync/types'
import { ConflictItemCard } from '@rotra/ui/conflict-review-list/conflict-item-card'
import { Notice } from '@rotra/ui/notice'

export type ConflictReviewListProps = {
  conflicts: SyncConflict[]
  onSelectPlayer: (id: string) => void
}
export function ConflictReviewList({ conflicts, onSelectPlayer }: ConflictReviewListProps) {
  return (
    <section className="flex min-w-0 flex-col gap-4">
      <h2 className="m-0 text-lg font-bold">Review original-device records</h2>
      <Notice tone="warn" title="Session done is blocked.">
        These confirmed records disagree. Resolution needs a supported reconciliation rule before
        Session done can continue. Confirmed winners cannot be edited here.
      </Notice>
      {conflicts.map((conflict) => (
        <ConflictItemCard key={conflict.id} conflict={conflict} onSelectPlayer={onSelectPlayer} />
      ))}
    </section>
  )
}
