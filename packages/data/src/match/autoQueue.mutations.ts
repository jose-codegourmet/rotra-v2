import { delay } from '../mock/latency'
import { type MockState, mockStore, readMockState } from '../mock/store'
import { requireSessionWrite, sessionIn } from '../mock/transaction'
import { autoQueueFingerprint, clearAutoQueueDrafts, emptyAutoQueueDraftState, selectAutoQueueDraft } from './autoQueue.rules'
import type { AutoQueueMode } from './autoQueue.types'
import { matchContext, requireLive } from './queue.mutations'

export function draftState(s: MockState, sessionId: string) {
  return s.autoQueueDrafts[sessionId] ??= emptyAutoQueueDraftState()
}
/** Draft edits never create match numbers, accepted assignments, or sync-log entries. */
export async function changeAutoQueueDrafts<T>(sessionId: string, change: (s: MockState) => T) {
  await delay()
  let data: T | undefined
  mockStore.update((s) => {
    requireSessionWrite(s, sessionId)
    requireLive(s, sessionId)
    data = change(s)
  })
  return data as T
}
export async function getAutoQueueDrafts(sessionId: string) {
  await delay()
  const s = readMockState()
  const session = sessionIn(s, sessionId)
  return {
    ...s.autoQueueDrafts[sessionId] ?? emptyAutoQueueDraftState(),
    fingerprint: autoQueueFingerprint(session, matchContext(s, sessionId)),
  }
}
export function editAutoQueueDrafts(input: { sessionId: string } & (
  | { action: 'select'; draftId: string; selected: boolean }
  | { action: 'clear'; mode: AutoQueueMode; unselectedOnly: boolean }
)) {
  return changeAutoQueueDrafts(input.sessionId, (s) => {
    const state = draftState(s, input.sessionId)
    if (input.action === 'select') selectAutoQueueDraft(state, input.draftId, input.selected)
    else clearAutoQueueDrafts(state, input.mode, input.unselectedOnly)
    return state
  })
}
