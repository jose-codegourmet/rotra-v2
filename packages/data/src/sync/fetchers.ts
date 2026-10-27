import { getMockDevState, subscribeMockBridge } from '../mock/bridge'
import { delay } from '../mock/latency'
import { type MockState, mockStore, readMockState } from '../mock/store'
import type { SaveOutcome, SyncArea } from './sync.types'
export function recordChange(
  state: MockState,
  change: { text: string; area: SyncArea },
  now = Date.now(),
): SaveOutcome {
  const savedOffline = getMockDevState().offline
  state.sync.online = !savedOffline
  state.sync.log.unshift({
    at: now,
    text: change.text,
    area: change.area,
    syncedAt: savedOffline ? null : now,
  })
  if (savedOffline) state.sync.pendingCount++
  else state.sync.lastSyncedAt = now
  return { savedOffline, message: saveToastText(change.text, { savedOffline }) }
}
export function saveToastText(message: string, outcome: { savedOffline: boolean }) {
  return message + (outcome.savedOffline ? ' · Saved on this device, waiting to sync' : '')
}
let epoch = 0
async function reconcile() {
  const token = ++epoch,
    offline = getMockDevState().offline
  mockStore.update((state) => {
    state.sync.online = !offline
    state.sync.syncing = !offline && state.sync.pendingCount > 0
  })
  if (offline || !mockStore.getSnapshot().sync.pendingCount) return
  await delay()
  if (token !== epoch || getMockDevState().offline) return
  mockStore.update((state) => {
    const now = Date.now()
    state.sync.syncedCount = state.sync.pendingCount
    for (const entry of state.sync.log) if (entry.syncedAt === null) entry.syncedAt = now
    state.sync.pendingCount = 0
    state.sync.syncing = false
    state.sync.lastSyncedAt = now
  })
}
/** Mounted by the query provider; cancel a pending reconciliation when that provider leaves. */
export function connectMockSync() {
  let offline = getMockDevState().offline
  const unsubscribe = subscribeMockBridge(() => {
    const next = getMockDevState().offline
    if (next !== offline) {
      offline = next
      void reconcile()
    }
  })
  void reconcile()
  return () => {
    epoch++
    unsubscribe()
  }
}
export async function getSyncState() {
  return readMockState().sync
}
