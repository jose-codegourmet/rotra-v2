export type SyncState =
  | 'saving'
  | 'saved-waiting'
  | 'syncing'
  | 'synced'
  | 'needs-attention'
  | 'failed'
  | 'offline'

export type SyncTone = 'ok' | 'busy' | 'warn' | 'error'

// The exact labels from product-terms §8 and the experience contract's save and sync language.
const LABEL: Record<SyncState, string> = {
  saving: 'Saving on this device',
  'saved-waiting': 'Saved on this device · waiting to sync',
  syncing: 'Syncing',
  synced: 'Synced',
  'needs-attention': 'Needs attention',
  failed: 'Changes could not be saved',
  offline: 'Offline',
}

/**
 * Full label; "Synced" carries the last sync time and offline says what is waiting, as the Queue
 * top bar shows them (access-home.md): "Synced 7:42 PM", "Offline · 3 waiting to sync",
 * "Working offline".
 */
export function syncLabel(state: SyncState, pending = 0, lastSyncedAt?: string): string {
  if (state === 'synced' && lastSyncedAt) return `Synced ${lastSyncedAt}`
  if (state === 'offline')
    return pending > 0 ? `Offline · ${pending} waiting to sync` : 'Working offline'
  return LABEL[state]
}

/** Phone label (≤ 480 px): "Synced" and "Offline · N" / "Offline"; the other states keep their words. */
export function syncShortLabel(state: SyncState, pending = 0): string {
  if (state === 'synced') return 'Synced'
  if (state === 'offline') return pending > 0 ? `Offline · ${pending}` : 'Offline'
  return syncLabel(state, pending)
}

export function syncTone(state: SyncState): SyncTone {
  if (state === 'synced') return 'ok'
  if (state === 'saving' || state === 'syncing') return 'busy'
  if (state === 'failed') return 'error'
  return 'warn'
}
