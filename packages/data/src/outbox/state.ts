import { resolveAccountId } from '../device/deviceIndex'
import type { SyncChange } from '../sync/sync.types'
import type { StoredCommand } from './outbox.types'
import { readOutbox } from './outboxStore'

/**
 * In-memory view of the outbox for this tab: the commands as last read from IndexedDB, whether a
 * replay is running, and what the last replay reported. Storage stays the truth; every change goes
 * there first and refreshes this view afterwards. Subscribers (the sync queries) are told on change.
 */

let commands: StoredCommand[] = []
let loadedFor: string | null = null
let loading: Promise<void> | null = null
let replaying = false
let problem: 'retry' | undefined
/** Commands this tab replayed successfully, newest first (Q-SYNC's Synced from this device). */
const synced: SyncChange[] = []
let lastReplayAt: number | null = null
const listeners = new Set<() => void>()

export function subscribeOutbox(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
const notify = () => {
  for (const listener of listeners) listener()
}

/** Re-reads the account's outbox; unreadable storage keeps the last view rather than inventing one. */
export async function refreshOutbox(): Promise<StoredCommand[]> {
  const accountId = await resolveAccountId()
  if (!accountId) {
    commands = []
    loadedFor = null
    notify()
    return commands
  }
  try {
    commands = await readOutbox(accountId)
    loadedFor = accountId
  } catch (error) {
    console.warn('[rotra] outbox not read', error)
  }
  notify()
  return commands
}

export function ensureOutboxLoaded() {
  if (!loading)
    loading = refreshOutbox()
      .then(() => undefined)
      .finally(() => {
        if (loadedFor === null) loading = null
      })
  return loading
}

export const outboxCommands = () => commands
export const pendingCount = () => commands.length
export const pendingFor = (sessionId: string) => commands.filter((c) => c.sessionId === sessionId)
export const hasPending = (sessionId: string) => commands.some((c) => c.sessionId === sessionId)
export const conflicts = () => commands.filter((c) => c.conflict)
export const isReplaying = () => replaying
export const replayProblem = () => problem
export const syncedChanges = () => synced
export const lastReplayedAt = () => lastReplayAt

export function setReplaying(on: boolean) {
  replaying = on
  notify()
}
export function setProblem(next: 'retry' | undefined) {
  problem = next
  notify()
}
export function noteSynced(change: SyncChange) {
  synced.unshift(change)
  synced.splice(50)
  lastReplayAt = change.syncedAt
}

/** Whether a GET of this path should keep answering from the device copy: its session has unsent changes. */
export async function pathHasPendingWork(sessionId: string | null) {
  await ensureOutboxLoaded()
  if (!commands.length) return false
  return sessionId === null ? true : hasPending(sessionId)
}
