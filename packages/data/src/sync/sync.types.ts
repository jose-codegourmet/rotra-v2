export type SyncArea =
  | 'Roster'
  | 'Session'
  | 'Session setup'
  | 'Queue'
  | 'Matches and results'
  | 'Courts and time'
  | 'Payments'
  | 'Club settings'
  | 'Session done'
  | 'Published results'
  | 'Other'
export type SyncState = {
  online: boolean
  syncing: boolean
  pendingCount: number
  lastSyncedAt: number
  syncedCount: number
  log: SyncChange[]
  problem?: 'retry' | 'not_saved' | 'authorization'
}
export type SaveOutcome = { savedOffline: boolean; message: string }

/**
 * Read-only evidence from two devices, or (real mode, #722) a change this device recorded that the
 * server refused with a 409: `pending` names it, `versions` is then empty, and the Queue Master can
 * keep the server's version or retry.
 */
export type SyncConflict = {
  id: string
  matchNumber: number
  courtLabel: string
  pending?: { text: string; area: SyncArea; recordedAt: number; message: string }
  versions: {
    deviceLabel: string
    order: number
    teamA: {
      id: string
      name: string
      shortName: string
      level: import('../player/player.types').PlayingLevel | null
    }[]
    teamB: {
      id: string
      name: string
      shortName: string
      level: import('../player/player.types').PlayingLevel | null
    }[]
    winner?: 'A' | 'B'
    score?: { teamA: number; teamB: number }
  }[]
}
export type SyncChange = {
  id: string
  at: number
  text: string
  area: SyncArea
  syncedAt: number | null
}
export type SyncStatus = {
  connectivity: 'online' | 'offline'
  syncing: boolean
  pendingCount: number
  lastSyncedAt: number | null
  problem?: 'retry' | 'not_saved' | 'authorization'
  incompleteRecords: boolean
  canFinishAndSync: boolean
}
export type SessionIntegrity = {
  sessionId: string
  state: 'complete' | 'records_missing' | 'awaiting_original' | 'conflicts' | 'unrecoverable'
  missingSummary: { label: string; detail: string }[]
  conflicts: SyncConflict[]
  secondDevice?: boolean
  snapshotAt?: number
}
