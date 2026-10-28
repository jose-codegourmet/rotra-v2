'use client'

import { Button } from '@rotra/ui/button'
import { Sheet } from '@rotra/ui/sheet'
import { SyncDetails, type SyncGroup } from '@rotra/ui/sync-status/sync-details'
import type { ReactNode } from 'react'

export type SyncSheetChange = { id?: string; area: string; text: string; at: number }
export type SyncStatusSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  status: 'online' | 'syncing' | 'offline'
  pendingChanges: SyncSheetChange[]
  syncedChanges: SyncSheetChange[]
  lastSyncedAt: number | null
  attention?: ReactNode
  incomplete?: boolean
}
const time = (at: number) =>
  new Date(at).toLocaleTimeString('en-PH', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Asia/Manila',
  })
function groups(changes: SyncSheetChange[]): SyncGroup[] {
  const result: SyncGroup[] = []
  changes.forEach((change, index) => {
    let group = result.find((g) => g.area === change.area)
    if (!group) {
      group = { area: change.area, changes: [] }
      result.push(group)
    }
    group.changes.push({
      id: change.id ?? `${change.at}-${index}`,
      text: change.text,
      at: time(change.at),
    })
  })
  return result
}
export function SyncStatusSheet({
  open,
  onOpenChange,
  status,
  pendingChanges,
  syncedChanges,
  lastSyncedAt,
  attention,
  incomplete,
}: SyncStatusSheetProps) {
  const count = pendingChanges.length
  const description = incomplete
    ? "This device's sync status does not include records still held by another device."
    : status === 'syncing'
      ? `Uploading ${count} change${count === 1 ? '' : 's'} from this device.`
      : status === 'offline'
        ? count
          ? `${count} change${count === 1 ? '' : 's'} saved on this device, waiting for internet. They sync automatically when you reconnect.`
          : 'Nothing is waiting. New changes save on this device until you reconnect.'
        : count
          ? `${count} change${count === 1 ? ' is' : 's are'} saved on this device and waiting to sync.`
          : `Everything on this device synced.${lastSyncedAt === null ? '' : ` Last sync ${time(lastSyncedAt)}.`}`
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Sync status"
      footer={<Button onClick={() => onOpenChange(false)}>Close</Button>}
    >
      {attention}
      <SyncDetails
        state={
          incomplete || (count > 0 && status === 'online')
            ? 'needs-attention'
            : status === 'online'
              ? 'synced'
              : status === 'offline'
                ? 'offline'
                : 'syncing'
        }
        pending={count}
        description={description}
        headline={
          incomplete
            ? 'Session records incomplete'
            : status === 'syncing'
              ? 'Syncing…'
              : status === 'offline'
                ? 'Working offline'
                : count
                  ? 'Waiting to sync'
                  : 'Online and synced'
        }
        waiting={groups(pendingChanges)}
        synced={groups([...syncedChanges].sort((a, b) => b.at - a.at).slice(0, 15))}
      />
    </Sheet>
  )
}
