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
  log: { at: number; text: string; area: SyncArea; syncedAt: number | null }[]
}
export type SaveOutcome = { savedOffline: boolean; message: string }
