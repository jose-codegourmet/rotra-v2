import { missingRecordsFixture, syncConflictsFixture } from '../fixtures/syncRecovery'
import type { MockDevState } from '../mock/bridge'
import type { MockState } from '../mock/store'
import { mockStore } from '../mock/store'
import type { SessionIntegrity } from './sync.types'

/** Mock integrity is explicit fixture state, never a claim that gaps were detected. */
export function integrityIn(state: MockState, sessionId: string): SessionIntegrity {
  return state.sessionIntegrity[sessionId] ?? { sessionId, state: 'complete', missingSummary: [], conflicts: [] }
}
export function applyRecoveryDevState(previous: MockDevState, next: MockDevState) {
  const session = mockStore.getSnapshot().sessions.find((s) => s.state === 'active') ?? mockStore.getSnapshot().sessions.find((s) => s.id === 's-tonight' && s.state === 'prepared')
  if (!session) return
  const changed = previous.recordsMissing !== next.recordsMissing || previous.secondDevice !== next.secondDevice || previous.originalDeviceLost !== next.originalDeviceLost || previous.originalDeviceReconnects !== next.originalDeviceReconnects
  if (!changed) return
  mockStore.update((state) => {
    const integrity = state.sessionIntegrity[session.id] ?? { sessionId: session.id, state: 'complete', missingSummary: [], conflicts: [] }
    if ((next.recordsMissing && !previous.recordsMissing || next.secondDevice && !previous.secondDevice) && integrity.state === 'complete') {
      integrity.state = 'records_missing'
      integrity.missingSummary = structuredClone(missingRecordsFixture)
    }
    integrity.secondDevice = !!next.secondDevice
    integrity.snapshotAt ??= Date.now()
    if (next.originalDeviceLost && !previous.originalDeviceLost) integrity.state = 'unrecoverable'
    // Once a conflict exists, toggling a dev flag never resolves it or chooses a winner.
    if (next.originalDeviceReconnects && !previous.originalDeviceReconnects && (integrity.state === 'awaiting_original' || integrity.state === 'records_missing')) {
      integrity.state = next.nextSaveConflict ? 'conflicts' : 'complete'
      integrity.conflicts = next.nextSaveConflict ? structuredClone(syncConflictsFixture) : []
      if (integrity.state === 'complete') integrity.missingSummary = []
    }
    state.sessionIntegrity[session.id] = integrity
  })
}
