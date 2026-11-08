'use client'
import type { AdminPlayer } from '@rotra/data/admin-player/types'
import { Button } from '@rotra/ui/button'
export type AdminPlayerBulkBarProps = {
  players: AdminPlayer[]
  offline?: boolean
  onClear: () => void
  onAction: (action: 'archive' | 'restore' | 'remove' | 'export' | 'copy') => void
}
export function AdminPlayerBulkBar({
  players,
  offline,
  onClear,
  onAction,
}: AdminPlayerBulkBarProps) {
  if (!players.length) return null
  const blocked = players.filter((p) => p.removalReason).length
  return (
    <section
      aria-label="Actions for the selected players"
      className="fixed bottom-[max(12px,env(safe-area-inset-bottom,0px))] left-1/2 z-30 flex w-[min(calc(100%-24px),720px)] -translate-x-1/2 flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-border-strong bg-surface px-3 py-2.5 shadow-pop"
    >
      <b className="flex-1 text-sm tabular-nums" aria-live="polite">
        {players.length} selected
      </b>
      <Button size="xs" variant="ghost" onClick={onClear}>
        Clear
      </Button>
      <div className="order-3 flex basis-full flex-wrap gap-1.5">
        <Button size="xs" disabled={offline} onClick={() => onAction('archive')}>
          Archive
        </Button>
        <Button size="xs" disabled={offline} onClick={() => onAction('restore')}>
          Restore
        </Button>
        <Button
          size="xs"
          variant="danger"
          disabled={offline || blocked > 0}
          title={blocked ? `${blocked} cannot be removed` : undefined}
          onClick={() => onAction('remove')}
        >
          Remove {blocked ? `(${blocked} ineligible)` : ''}
        </Button>
        <Button size="xs" onClick={() => onAction('export')}>
          Export CSV
        </Button>
        <Button size="xs" onClick={() => onAction('copy')}>
          Copy RTR IDs
        </Button>
      </div>
    </section>
  )
}
