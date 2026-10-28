'use client'

import { ConfirmSheet } from '@rotra/ui/confirm-sheet'

/** The four counts the business rules work out before a rebuild (queue.rules › regenerateScope). */
export type RegenerateScope = {
  /** Automatic and suggested (unprotected) waiting matches: rebuilt */
  autoRebuilt: number
  /** Protected manual matches that are healthy: kept */
  healthyManualKept: number
  /** Protected manual matches needing attention: rebuilt */
  attentionManualRebuilt: number
  /** Active matches: never touched */
  gamesInPlay: number
}

export type RegenerateQueueSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  scope: RegenerateScope
  onConfirm: () => void
  /** The rebuild is running: nothing can fire twice */
  isPending?: boolean
  /** Why generation failed; the previous queue was restored */
  error?: string
}

/**
 * D-REGENERATE: the counts a rebuild would touch, Keep current queue, and Regenerate waiting queue
 * (disabled when nothing would be rebuilt). Active matches are never changed.
 */
export function RegenerateQueueSheet({
  open,
  onOpenChange,
  scope,
  onConfirm,
  isPending,
  error,
}: RegenerateQueueSheetProps) {
  const rows = [
    { label: 'Automatic waiting matches', value: `${scope.autoRebuilt} rebuilt` },
    { label: 'Healthy manual matches', value: `${scope.healthyManualKept} kept` },
    { label: 'Manual matches needing attention', value: `${scope.attentionManualRebuilt} rebuilt` },
    { label: 'Games in play', value: `${scope.gamesInPlay} untouched` },
  ]
  const nothingToRebuild = scope.autoRebuilt + scope.attentionManualRebuilt === 0
  return (
    <ConfirmSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Regenerate waiting queue?"
      confirmLabel="Regenerate waiting queue"
      backLabel="Keep current queue"
      confirmDisabled={nothingToRebuild}
      isPending={isPending}
      error={error}
      onConfirm={onConfirm}
      summary={
        <ul className="m-0 flex list-none flex-col divide-y divide-border p-0">
          {rows.map((row) => (
            <li key={row.label} className="flex min-w-0 items-center gap-3 py-3">
              <span className="min-w-0 flex-1">{row.label}</span>
              <b className="tabular-nums">{row.value}</b>
            </li>
          ))}
        </ul>
      }
      consequence="Rebuilt matches take the queue slots of the ones they replace."
    />
  )
}
