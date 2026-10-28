'use client'

import { useNowCard } from '@rotra/data/queue-session/useNowCard'
import { useRetrySync } from '@rotra/data/sync/useRetrySync'
import { useSessionIntegrity } from '@rotra/data/sync/useSessionIntegrity'
import { useSyncLog } from '@rotra/data/sync/useSyncLog'
import { useSyncStatus } from '@rotra/data/sync/useSyncStatus'
import { SyncAttentionNotice } from '@rotra/ui/sync-attention-notice'
import { SyncStatusSheet } from '@rotra/ui/sync-status-sheet'
import { toast } from '@rotra/ui/toaster'

export type SyncStatusDialogProps = { open: boolean; onOpenChange: (open: boolean) => void }
export function SyncStatusDialog({ open, onOpenChange }: SyncStatusDialogProps) {
  const status = useSyncStatus(),
    log = useSyncLog(),
    retry = useRetrySync(),
    now = useNowCard()
  const sessionId = now.data?.live?.id ?? now.data?.upcoming?.id ?? ''
  const integrity = useSessionIntegrity(sessionId)
  if (!status.data || !log.data) return null
  const s = status.data,
    incomplete = s.incompleteRecords || (!!integrity.data && integrity.data.state !== 'complete')
  return (
    <SyncStatusSheet
      open={open}
      onOpenChange={onOpenChange}
      status={s.connectivity === 'offline' ? 'offline' : s.syncing ? 'syncing' : 'online'}
      pendingChanges={log.data.pendingChanges}
      syncedChanges={log.data.syncedChanges}
      lastSyncedAt={s.lastSyncedAt}
      incomplete={incomplete}
      attention={
        <>
          {s.problem ? (
            <SyncAttentionNotice
              variant={s.problem === 'not_saved' ? 'not-saved' : s.problem}
              canFinishAndSync={s.canFinishAndSync}
              retrying={retry.isPending}
              onRetry={() =>
                retry.mutate(undefined, { onError: (error) => toast.error(error.message) })
              }
            />
          ) : null}
          {incomplete ? <SyncAttentionNotice variant="incomplete" /> : null}
        </>
      }
    />
  )
}
