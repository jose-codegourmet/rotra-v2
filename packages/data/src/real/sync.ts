import type { QueryClient } from '@tanstack/react-query'
import { getConnectivity, subscribeConnectivity } from '../connectivity/connectivity'
import { continueHere, giveUpLocalCopy, outboxIntegrityOf } from '../outbox/conflicts'
import { pendingChangesOf } from '../outbox/outbox.rules'
import { onReplayFinished, replayOutbox } from '../outbox/replay'
import {
  ensureOutboxLoaded,
  isReplaying,
  lastReplayedAt,
  outboxCommands,
  pendingCount,
  replayProblem,
  subscribeOutbox,
  syncedChanges,
} from '../outbox/state'
import { syncKeys } from '../sync/queryKeys'
import type { SessionIntegrity, SyncChange, SyncState, SyncStatus } from '../sync/sync.types'
import { msOf, realRequest } from './client'

/**
 * Real-mode sync (#399, #722). What waits on this device is the outbox (`outbox/`): commands
 * recorded offline on a downloaded, started session, replayed in order when the internet returns.
 * These adapters report that count, whether a replay runs, what the last one hit, and what the
 * server holds (F07.28 completeness). "Saved on this device" is said only for a command that is in
 * the outbox. Device enrollment and the server's stream protocol are not built for MVP
 * (D-2026-11-11-04).
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

/** Synced HH:MM is the later of the server's check and this tab's last replayed change. */
const lastSyncedAt = (summary: { checkedAt: number } | null) =>
  Math.max(summary?.checkedAt ?? 0, lastReplayedAt() ?? 0) || null

export async function realGetSyncStatus(): Promise<SyncStatus> {
  await ensureOutboxLoaded()
  const summary = await readSummary()
  const pending = pendingCount()
  return {
    connectivity: online() ? 'online' : 'offline',
    syncing: isReplaying(),
    pendingCount: pending,
    lastSyncedAt: lastSyncedAt(summary),
    problem: replayProblem(),
    incompleteRecords: summary?.incompleteRecords ?? false,
    // Session done needs internet and nothing waiting on this device (authorization is the server's).
    canFinishAndSync: online() && pending === 0 && !isReplaying(),
  }
}

export async function realGetSyncState(): Promise<SyncState> {
  await ensureOutboxLoaded()
  const summary = await readSummary()
  return {
    online: online(),
    syncing: isReplaying(),
    pendingCount: pendingCount(),
    // Only shown as "Synced HH:MM" while online, which always follows a server answer.
    lastSyncedAt: lastSyncedAt(summary) ?? 0,
    syncedCount: syncedChanges().length,
    log: [...pendingChangesOf(outboxCommands()), ...syncedChanges()],
    problem: replayProblem(),
  }
}

/** Q-SYNC: the outbox as Waiting to sync, and what this tab replayed as Synced from this device. */
export async function realGetSyncLog(): Promise<{
  pendingChanges: SyncChange[]
  syncedChanges: SyncChange[]
}> {
  await ensureOutboxLoaded()
  return {
    pendingChanges: pendingChangesOf(outboxCommands()),
    syncedChanges: syncedChanges().slice(0, 15),
  }
}

/** Retry sync: replays what waits (online), then re-checks the server's status. */
export async function realRetrySync() {
  if (!online()) return { message: 'Waiting for internet' }
  await replayOutbox()
  await readSummary()
  return { message: replayProblem() ? 'Sync needs attention' : 'Sync checked' }
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/**
 * One session's integrity: first what this device still holds (unsent commands → records missing,
 * a refused command → conflicts for Q-CONFLICT), then the server's completeness. Unproven
 * completeness is shown as missing records with the server's counts.
 */
export async function realGetSessionIntegrity(sessionId: string): Promise<SessionIntegrity> {
  const local = await outboxIntegrityOf(sessionId)
  if (local) return local
  if (!online())
    return {
      sessionId,
      state: 'records_missing',
      missingSummary: [
        {
          label: 'Not connected',
          detail: "ROTRA can't check this session's records while offline.",
        },
      ],
      conflicts: [],
    }
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

/**
 * Q-INTERRUPTION over the outbox. Yes (the session was interrupted, continue here): this device's
 * changes replay now; offline they wait for the original device, this one, to reconnect. No: the
 * local copy is given up (its commands cleared, the copy superseded); the screen then asks for the
 * explicit invalid-session confirmation, as the mock does.
 */
export async function realAnswerInterruption(input: {
  sessionId: string
  answer: 'yes' | 'no'
}): Promise<SessionIntegrity> {
  if (input.answer === 'no') {
    await giveUpLocalCopy(input.sessionId)
    return { sessionId: input.sessionId, state: 'unrecoverable', missingSummary: [], conflicts: [] }
  }
  await continueHere()
  const integrity = await realGetSessionIntegrity(input.sessionId)
  if (integrity.state === 'records_missing' && !online())
    return { ...integrity, state: 'awaiting_original' }
  return integrity
}

/**
 * Connectivity changes (browser events or "Simulate offline") don't refetch paused queries, so the
 * sync status follows them here; coming back online replays the outbox, and every change of the
 * outbox refreshes the sync queries. A finished replay refetches everything, so the screens show
 * what the server saved.
 */
export function connectRealSync(client: QueryClient) {
  if (typeof window === 'undefined') return () => {}
  const wentOffline = () => {
    client.setQueryData<SyncStatus>(syncKeys.status(), (old) =>
      old ? { ...old, connectivity: 'offline', canFinishAndSync: false } : old,
    )
    client.setQueryData<SyncState>(syncKeys.state(), (old) =>
      old ? { ...old, online: false } : old,
    )
  }
  const reconnected = () => {
    void client.invalidateQueries({ queryKey: syncKeys.all })
    void replayOutbox()
  }
  let previous = getConnectivity()
  const unsubscribeConnectivity = subscribeConnectivity(() => {
    const next = getConnectivity()
    if (next === previous) return
    previous = next
    if (next === 'offline') wentOffline()
    else reconnected()
  })
  const unsubscribeOutbox = subscribeOutbox(() => {
    void client.invalidateQueries({ queryKey: syncKeys.all })
  })
  const unsubscribeFinished = onReplayFinished(() => {
    void client.invalidateQueries({ predicate: (query) => query.queryKey[0] !== 'auth' })
  })
  // Commands left from an earlier visit replay as soon as the app is open and online.
  if (previous === 'online') void ensureOutboxLoaded().then(() => replayOutbox())
  return () => {
    unsubscribeConnectivity()
    unsubscribeOutbox()
    unsubscribeFinished()
  }
}
