import { checkMockSave } from '../mock/bridge'
import { MockError, NotConnectedError } from '../mock/errors'
import { delay } from '../mock/latency'
import { type MockState, mockStore, readMockState } from '../mock/store'
import { queueMutation, requireSessionWrite, sessionIn } from '../mock/transaction'
import { isRealDataMode } from '../real/mode'
import {
  allAutoQueueDrafts,
  autoQueueDraftConflict,
  autoQueueFingerprint,
  clearAutoQueueDrafts,
  emptyAutoQueueDraftState,
  generateAutoQueueMatches,
  selectAutoQueueDraft,
} from './autoQueue.rules'
import type { AutoQueueCount, AutoQueueMode } from './autoQueue.types'
import { append, matchContext, requireLive } from './queue.mutations'

export function draftState(s: MockState, sessionId: string) {
  s.autoQueueDrafts[sessionId] ??= emptyAutoQueueDraftState()
  return s.autoQueueDrafts[sessionId]
}
/**
 * Real mode (#396): Auto queue drafts stay not connected. No service stores a draft working set
 * or accepts a reviewed draft lineup as an `auto` match (the server's Auto queue generates its own
 * batch), and the draft modes' weights are part of the open queue-generation decision (#247).
 */
const notConnected = () => Promise.reject(new NotConnectedError())

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
  if (isRealDataMode()) return notConnected()
  await delay()
  const s = readMockState()
  const session = sessionIn(s, sessionId)
  return {
    ...(s.autoQueueDrafts[sessionId] ?? emptyAutoQueueDraftState()),
    fingerprint: autoQueueFingerprint(session, matchContext(s, sessionId)),
  }
}
export function editAutoQueueDrafts(
  input: { sessionId: string } & (
    | { action: 'select'; draftId: string; selected: boolean }
    | { action: 'unselect-all' }
    | { action: 'clear'; mode: AutoQueueMode; unselectedOnly: boolean }
  ),
) {
  if (isRealDataMode()) return notConnected()
  return changeAutoQueueDrafts(input.sessionId, (s) => {
    const state = draftState(s, input.sessionId)
    if (input.action === 'select') selectAutoQueueDraft(state, input.draftId, input.selected)
    else if (input.action === 'unselect-all') state.selectedIds = []
    else clearAutoQueueDrafts(state, input.mode, input.unselectedOnly)
    return state
  })
}

export function generateAutoQueueDrafts(input: {
  sessionId: string
  mode: AutoQueueMode
  catchUpTarget?: number
  count: AutoQueueCount
  preserveSelected?: boolean
}) {
  if (isRealDataMode()) return notConnected()
  return changeAutoQueueDrafts(input.sessionId, (s) => {
    if (![2, 3, 4, 6].includes(input.count))
      throw new MockError('permission', 'Choose 2, 3, 4 or 6 matches.')
    const session = sessionIn(s, input.sessionId),
      ctx = matchContext(s, session.id)
    const state = draftState(s, session.id),
      old = state.batches[input.mode]?.drafts ?? []
    const retained = input.preserveSelected
      ? old.filter((d) => state.selectedIds.includes(d.id))
      : []
    const result = generateAutoQueueMatches({
      session,
      ctx,
      mode: input.mode,
      limit: Math.max(0, input.count - retained.length),
      retained,
      catchUpTarget: input.catchUpTarget,
    })
    if (result.error) throw new MockError('permission', result.error)
    const fingerprint = autoQueueFingerprint(session, ctx)
    const reason = {
      available: 'Available players with the lowest planned load',
      ahead: 'Available players first, then present players still playing',
      wait: 'Longest wait after planned assignments',
      fewest: 'Fewest games after planned assignments',
      catchup: `Below the chosen completed-game target of ${input.catchUpTarget}`,
    }[input.mode]
    state.batches[input.mode] = {
      drafts: [
        ...retained,
        ...result.matches.map((m) => ({
          ...m,
          id: crypto.randomUUID(),
          mode: input.mode,
          reason,
          fingerprint,
        })),
      ],
      stopReason: result.stopReason,
      ...(input.mode === 'catchup' ? { catchUpTarget: input.catchUpTarget } : {}),
    }
    const remaining = new Set(allAutoQueueDrafts(state).map((d) => d.id))
    state.selectedIds = state.selectedIds.filter((id) => remaining.has(id))
    checkMockSave()
    return state
  })
}

export function transferAutoQueueDrafts(input: {
  sessionId: string
  draftIds: string[]
  operationId: string
}) {
  if (isRealDataMode()) return notConnected()
  if (!input.operationId.trim()) throw new MockError('permission', 'A confirmation ID is required.')
  return queueMutation(
    {
      area: 'Queue',
      sessionId: input.sessionId,
      operationId: `auto-queue:${input.operationId}`,
      fingerprint: JSON.stringify([input.sessionId, input.draftIds]),
    },
    (s) => {
      const session = requireLive(s, input.sessionId),
        state = draftState(s, session.id)
      if (!input.draftIds.length || new Set(input.draftIds).size !== input.draftIds.length)
        throw new MockError('conflict', 'Review a non-empty selection of different drafts.')
      const all = allAutoQueueDrafts(state),
        ctx = matchContext(s, session.id)
      const drafts = input.draftIds.map((id) => {
        if (state.committedIds.includes(id))
          throw new MockError('conflict', 'This draft was already added to Main Queue.')
        const draft = all.find((d) => d.id === id)
        if (!draft) throw new MockError('conflict', 'Drafts changed. Review them again.')
        const conflict = autoQueueDraftConflict(draft, session, ctx)
        if (conflict) throw new MockError('conflict', conflict)
        return draft
      })
      const matches = drafts.map((d) =>
        append(s, session.id, { format: d.format, teamA: d.teamA, teamB: d.teamB }, 'auto', false),
      )
      for (const batch of Object.values(state.batches))
        if (batch) {
          batch.drafts = batch.drafts.filter((d) => !input.draftIds.includes(d.id))
          if (!batch.drafts.length) delete batch.stopReason
        }
      state.selectedIds = state.selectedIds.filter((id) => !input.draftIds.includes(id))
      state.committedIds.push(...input.draftIds)
      return {
        data: matches,
        text: `${matches.length} draft${matches.length === 1 ? '' : 's'} added to Main Queue`,
      }
    },
  )
}
