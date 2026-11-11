import type { QueryClient } from '@tanstack/react-query'
import { getConnectivity, subscribeConnectivity } from '../connectivity/connectivity'
import { NotConnectedError } from '../mock/errors'
import { syncKeys } from '../sync/queryKeys'
import type { SessionIntegrity, SyncChange, SyncState, SyncStatus } from '../sync/sync.types'
import { msOf, realRequest } from './client'

/**
 * Real-mode sync (#399). The device copy is read-only (`device/deviceCopy.ts`, #477): downloaded
 * sessions stay viewable offline, but there is no browser outbox, so every real write is online and
 * "saved" only when its Route Handler accepted it: nothing ever waits on this device, and nothing
 * here may say "Saved on this device". These adapters report that truthfully plus what the server
 * holds (F07.28 completeness). Device enrollment, uploads, seals, the interruption answer and
 * conflict authority wait on #246 / Q11.
 */

type WireClubSyncSummary = { incompleteSessionIds: string[]; checkedAt: string }
type WireSessionSync = {
  streams: { state: string }[]
  conflicts: { id: string; category: string; detectedAt: string }[]
  completeness: {
    proven: boolean
    openStreams: number
    openConflicts: number
    pendingOperations: number
  }
}

const online = () => getConnectivity() === 'online'

/** Last server answer in this tab; offline, the top bar keeps it instead of inventing a time. */
let lastSummary: { incompleteRecords: boolean; checkedAt: number } | null = null

async function readSummary() {
  if (!online()) return lastSummary
  const { incompleteSessionIds, checkedAt } = await realRequest<WireClubSyncSummary>('/api/sync')
  lastSummary = { incompleteRecords: incompleteSessionIds.length > 0, checkedAt: msOf(checkedAt) }
  return lastSummary
}

export async function realGetSyncStatus(): Promise<SyncStatus> {
  const summary = await readSummary()
  return {
    connectivity: online() ? 'online' : 'offline',
    syncing: false,
    pendingCount: 0,
    lastSyncedAt: summary?.checkedAt ?? null,
    problem: undefined,
    incompleteRecords: summary?.incompleteRecords ?? false,
    // Authorization is checked by the server on every request; there is no offline finish yet.
    canFinishAndSync: true,
  }
}

export async function realGetSyncState(): Promise<SyncState> {
  const summary = await readSummary()
  return {
    online: online(),
    syncing: false,
    pendingCount: 0,
    // Only shown as "Synced HH:MM" while online, which always follows a server answer.
    lastSyncedAt: summary?.checkedAt ?? 0,
    syncedCount: 0,
    log: [],
  }
}

/** No device change log is kept in real mode yet: nothing is pending here, nothing is listed. */
export async function realGetSyncLog(): Promise<{
  pendingChanges: SyncChange[]
  syncedChanges: SyncChange[]
}> {
  return { pendingChanges: [], syncedChanges: [] }
}

/** Nothing waits on this device, so a retry re-checks the server's status. */
export async function realRetrySync() {
  if (!online()) return { message: 'Waiting for internet' }
  await readSummary()
  return { message: 'Sync checked' }
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/**
 * The server's completeness for one session. Unproven completeness is shown as missing records with
 * the server's counts; conflict evidence and second-device details are not exposed yet (#246).
 */
export async function realGetSessionIntegrity(sessionId: string): Promise<SessionIntegrity> {
  const { completeness } = await realRequest<WireSessionSync>(
    `/api/sessions/${encodeURIComponent(sessionId)}/sync`,
  )
  if (completeness.proven)
    return { sessionId, state: 'complete', missingSummary: [], conflicts: [] }
  const missingSummary: SessionIntegrity['missingSummary'] = []
  if (completeness.openStreams)
    missingSummary.push({
      label: 'Device records not closed',
      detail: `${plural(completeness.openStreams, 'device has', 'devices have')} not sent and closed their records.`,
    })
  if (completeness.pendingOperations)
    missingSummary.push({
      label: 'Changes not processed',
      detail: `${plural(completeness.pendingOperations, 'uploaded change is', 'uploaded changes are')} waiting on an earlier one.`,
    })
  if (completeness.openConflicts)
    missingSummary.push({
      label: 'Sync conflicts',
      detail: `${plural(completeness.openConflicts, 'conflict needs', 'conflicts need')} review.`,
    })
  return { sessionId, state: 'records_missing', missingSummary, conflicts: [] }
}

/** The interruption answer and its recovery path are not settled (#246). */
export async function realAnswerInterruption(): Promise<SessionIntegrity> {
  throw new NotConnectedError()
}

/**
 * Connectivity changes (browser events or "Simulate offline") don't refetch paused queries, so the
 * sync status follows them here.
 */
export function connectRealSync(client: QueryClient) {
  if (typeof window === 'undefined') return () => {}
  const wentOffline = () => {
    client.setQueryData<SyncStatus>(syncKeys.status(), (old) =>
      old ? { ...old, connectivity: 'offline' } : old,
    )
    client.setQueryData<SyncState>(syncKeys.state(), (old) =>
      old ? { ...old, online: false } : old,
    )
  }
  const reconnected = () => void client.invalidateQueries({ queryKey: syncKeys.all })
  let previous = getConnectivity()
  return subscribeConnectivity(() => {
    const next = getConnectivity()
    if (next === previous) return
    previous = next
    if (next === 'offline') wentOffline()
    else reconnected()
  })
}
