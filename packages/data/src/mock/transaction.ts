import { DEMO_CLUB_ID } from '../fixtures/clubs'
import { recordChange } from '../sync/fetchers'
import type { SaveOutcome, SyncArea } from '../sync/sync.types'
import { checkMockSave, getMockDevState, requireOnline } from './bridge'
import { MockError } from './errors'
import { delay } from './latency'
import { type MockState, mockStore } from './store'
export function requireClubAccess() {
  if (getMockDevState().licenseExpired) throw new MockError('permission', 'Your license has ended.')
}
export function sessionIn(state: MockState, id: string) {
  const session = state.sessions.find((s) => s.id === id && s.clubId === DEMO_CLUB_ID)
  if (!session) throw new MockError('permission', 'Session not available.')
  return session
}
export function requireSessionWrite(state: MockState, id: string) {
  const session = sessionIn(state, id)
  if (session.state !== 'prepared' && session.state !== 'active')
    throw new MockError('permission', 'This session is read-only.')
  if (getMockDevState().offline && state.downloads[id] !== 'ready')
    throw new MockError('offline', 'No downloaded copy on this device. Connect, or download first.')
  if (getMockDevState().licenseExpired && session.state !== 'active') requireClubAccess()
  return session
}
/** One atomic in-memory write includes domain data and its sync log; thrown validation leaves both intact. */
export async function queueMutation<T>(
  options: {
    area: SyncArea
    onlineOnly?: boolean
    clubAccess?: boolean
    sessionId?: string
    operationId?: string
    fingerprint?: string
  },
  change: (draft: MockState) => { data: T; text: string },
): Promise<SaveOutcome & { data: T }> {
  await delay()
  if (options.onlineOnly) requireOnline()
  if (options.clubAccess) requireClubAccess()
  let result: (SaveOutcome & { data: T }) | undefined
  // Idempotency is checked before local-save flags: a replay is not a new write.
  if (options.operationId) {
    const saved = mockStore.getSnapshot().operations[options.operationId]
    if (saved) {
      if (saved.fingerprint !== options.fingerprint)
        throw new MockError('conflict', 'This confirmation was already used.')
      return structuredClone(saved.outcome) as SaveOutcome & { data: T }
    }
  }
  mockStore.update((draft) => {
    if (options.sessionId) requireSessionWrite(draft, options.sessionId)
    const changed = change(draft)
    checkMockSave()
    result = {
      ...recordChange(draft, { text: changed.text, area: options.area }),
      data: changed.data,
    }
    if (options.operationId)
      draft.operations[options.operationId] = {
        fingerprint: options.fingerprint ?? '',
        outcome: structuredClone(result),
      }
  })
  if (!result) throw new Error('Mutation produced no result.')
  return result
}
