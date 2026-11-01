'use client'
import type { AdminPlayer } from '@rotra/data/admin-player/types'
import { Button } from '@rotra/ui/button'
import { SelectionBar } from '@rotra/ui/selection-bar'
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
  const blocked = players.filter((p) => p.removalReason).length
  const actions = (
    <>
      <Button size="sm" disabled={offline} onClick={() => onAction('archive')}>
        Archive
      </Button>
      <Button size="sm" disabled={offline} onClick={() => onAction('restore')}>
        Restore
      </Button>
      <Button
        size="sm"
        disabled={offline || blocked > 0}
        title={blocked ? `${blocked} cannot be removed` : undefined}
        onClick={() => onAction('remove')}
      >
        Remove {blocked ? `(${blocked} ineligible)` : ''}
      </Button>
      <Button size="sm" onClick={() => onAction('export')}>
        Export CSV
      </Button>
      <Button size="sm" onClick={() => onAction('copy')}>
        Copy RTR IDs
      </Button>
    </>
  )
  return (
    <SelectionBar
      players={players}
      label="Player management"
      valid
      onClear={onClear}
      className="bottom-3"
      actions={actions}
    />
  )
}
