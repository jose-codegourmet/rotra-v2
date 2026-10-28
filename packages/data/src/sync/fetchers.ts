import { getMockDevState, subscribeMockBridge, subscribeMockSaveFailure } from '../mock/bridge'
import { delay } from '../mock/latency'
import { type MockState, mockStore, readMockState } from '../mock/store'
import { sessionIn } from '../mock/transaction'
import { applyRecoveryDevState, integrityIn } from './integrity'
import type { SaveOutcome, SyncArea, SyncStatus } from './sync.types'

export function recordChange(
  state: MockState,
  change: { text: string; area: SyncArea },
  now = Date.now(),
): SaveOutcome {
  const dev = getMockDevState(),
    savedOffline = dev.offline,
    pending =
      savedOffline || !!dev.syncFails || (!!dev.authorizationExpired && !dev.activeFinishAllowed)
  state.sync.online = !savedOffline
  state.sync.problem = dev.authorizationExpired
    ? 'authorization'
    : dev.syncFails && !savedOffline
      ? 'retry'
      : undefined
  state.sync.log.unshift({
    id: crypto.randomUUID(),
    at: now,
    text: change.text,
    area: change.area,
    syncedAt: pending ? null : now,
  })
  if (pending) state.sync.pendingCount++
  else state.sync.lastSyncedAt = now
  return { savedOffline, message: saveToastText(change.text, { savedOffline }) }
}
export function saveToastText(message: string, outcome: { savedOffline: boolean }) {
  return message + (outcome.savedOffline ? ' · Saved on this device, waiting to sync' : '')
}
let epoch = 0
async function reconcile() {
  const token = ++epoch,
    dev = getMockDevState(),
    offline = dev.offline,
    authorizationBlocked = !!dev.authorizationExpired && !dev.activeFinishAllowed
  mockStore.update((state) => {
    state.sync.online = !offline
    if (dev.authorizationExpired) state.sync.problem = 'authorization'
    else if (state.sync.problem === 'authorization') state.sync.problem = undefined
    state.sync.syncing =
      !offline && !dev.syncFails && !authorizationBlocked && state.sync.pendingCount > 0
    if (!offline && dev.syncFails && state.sync.pendingCount && state.sync.problem !== 'not_saved')
      state.sync.problem = 'retry'
  })
  if (
    offline ||
    dev.syncFails ||
    authorizationBlocked ||
    !mockStore.getSnapshot().sync.pendingCount
  )
    return
  const generation = mockStore.getGeneration()
  await delay(1400)
  if (token !== epoch || getMockDevState().offline || generation !== mockStore.getGeneration())
    return
  if (getMockDevState().syncFails) {
    mockStore.update((state) => {
      state.sync.syncing = false
      state.sync.problem = 'retry'
    })
    return
  }
  mockStore.update((state) => {
    const now = Date.now()
    state.sync.syncedCount = state.sync.pendingCount
    for (const entry of state.sync.log) if (entry.syncedAt === null) entry.syncedAt = now
    state.sync.pendingCount = 0
    state.sync.syncing = false
    state.sync.lastSyncedAt = now
    if (state.sync.problem === 'retry') state.sync.problem = undefined
  })
}
/** No upload/replay engine: only in-memory state transitions driven by dev controls. */
export function connectMockSync() {
  let previous = getMockDevState()
  applyRecoveryDevState(
    { offline: false, licenseExpired: false, nextSaveFails: false, nextSaveConflict: false },
    previous,
  )
  const unsubscribe = subscribeMockBridge(() => {
    const next = getMockDevState()
    applyRecoveryDevState(previous, next)
    const connectivityChanged =
      next.offline !== previous.offline ||
      next.syncFails !== previous.syncFails ||
      next.authorizationExpired !== previous.authorizationExpired ||
      next.activeFinishAllowed !== previous.activeFinishAllowed
    previous = { ...next }
    if (connectivityChanged) void reconcile()
  })
  const unsubscribeFailure = subscribeMockSaveFailure(() =>
    mockStore.update((state) => {
      state.sync.problem = 'not_saved'
    }),
  )
  void reconcile()
  return () => {
    epoch++
    unsubscribe()
    unsubscribeFailure()
  }
}
export async function getSyncState() {
  return readMockState().sync
}
export async function getSyncStatus(): Promise<SyncStatus> {
  const state = readMockState(),
    dev = getMockDevState()
  return {
    connectivity: dev.offline ? 'offline' : 'online',
    syncing: state.sync.syncing,
    pendingCount: state.sync.pendingCount,
    lastSyncedAt: state.sync.lastSyncedAt,
    problem:
      state.sync.problem === 'not_saved'
        ? 'not_saved'
        : dev.authorizationExpired
          ? 'authorization'
          : state.sync.problem,
    incompleteRecords: Object.values(state.sessionIntegrity).some(
      (i) =>
        i.state !== 'complete' &&
        state.sessions.some(
          (s) => s.id === i.sessionId && (s.state === 'active' || s.state === 'prepared'),
        ),
    ),
    canFinishAndSync:
      !dev.authorizationExpired ||
      (!!dev.activeFinishAllowed && state.sessions.some((s) => s.state === 'active')),
  }
}
export async function getSyncLog() {
  const log = readMockState().sync.log
  return {
    pendingChanges: log.filter((entry) => entry.syncedAt === null),
    syncedChanges: log.filter((entry) => entry.syncedAt !== null).slice(0, 15),
  }
}
export async function retrySync() {
  await reconcile()
  return {
    message: getMockDevState().offline
      ? 'Waiting for internet'
      : getMockDevState().syncFails
        ? 'Sync needs attention'
        : 'Sync checked',
  }
}
export async function getSessionIntegrity(sessionId: string) {
  const state = readMockState()
  sessionIn(state, sessionId)
  return integrityIn(state, sessionId)
}
export async function answerInterruption({
  sessionId,
  answer,
}: {
  sessionId: string
  answer: 'yes' | 'no'
}) {
  await delay()
  mockStore.update((state) => {
    sessionIn(state, sessionId)
    const integrity = integrityIn(state, sessionId)
    if (answer === 'yes' && integrity.state === 'records_missing')
      integrity.state = 'awaiting_original'
    state.sessionIntegrity[sessionId] = integrity
  })
  return getSessionIntegrity(sessionId)
}
