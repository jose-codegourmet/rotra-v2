import { integrityIn } from '../sync/integrity'
import { activeMatches } from '../match/match.rules'
import { checkMockSave, getMockDevState } from '../mock/bridge'
import { MockError } from '../mock/errors'
import { delay } from '../mock/latency'
import { type MockState, mockStore, readMockState } from '../mock/store'
import { queueMutation, sessionIn } from '../mock/transaction'
import { createResultSnapshot } from '../session-result/sessionResult.rules'
import { recordChange } from '../sync/fetchers'
import type { SaveOutcome } from '../sync/sync.types'
import {
  FINALIZATION_STAGES,
  type FinalizationStage,
  type SessionDoneBlocker,
  type SessionFinalization,
} from './queueSession.types'

/** Session done refusals carry which gate failed so the sheet can show the matching notice. */
export class SessionDoneError extends MockError {
  constructor(
    readonly blocker: SessionDoneBlocker,
    message: string,
  ) {
    super(blocker === 'offline' ? 'offline' : 'conflict', message)
  }
}
/** Mirrors `sessionIn` for the whole-session gates; a prepared session has nothing to finish. */
function sessionDoneBlocker(state: MockState, sessionId: string): SessionDoneError | null {
  const matches = activeMatches(state.matches.filter((m) => m.sessionId === sessionId))
  if (getMockDevState().offline)
    return new SessionDoneError('offline', 'Connect to finish and sync this session.')
  if (getMockDevState().authorizationExpired && !getMockDevState().activeFinishAllowed)
    return new SessionDoneError(
      'authorization',
      'Access must be restored before this session can finish and sync. Your local records are kept.',
    )
  if (integrityIn(state, sessionId).state !== 'complete')
    return new SessionDoneError(
      'incomplete_records',
      'Original session records are incomplete. Review recovery before Session done.',
    )
  if (state.sync.pendingCount > 0)
    return new SessionDoneError(
      'pending_changes',
      `${state.sync.pendingCount} change${state.sync.pendingCount === 1 ? ' is' : 's are'} still syncing.`,
    )
  if (matches.length)
    return new SessionDoneError(
      'games_in_play',
      `${matches.length} game${matches.length === 1 ? ' is' : 's are'} still in play. Finish or invalidate them first.`,
    )
  return null
}
export type FinalizeSessionInput = {
  sessionId: string
  commandId: string
  /**
   * Only read while the Foundation dev toggle "next save fails" is on: the stage that consumes it.
   * `checking` / `finishing` fail before commit (session stays active); `player_records` / `slides`
   * fail after commit (state `committed`, `failedStage` set). Defaults to `checking`.
   */
  failAtStage?: FinalizationStage
}
const STAGE_DELAY = 650
function setFinalization(sessionId: string, patch: Partial<SessionFinalization>) {
  mockStore.update((draft) => {
    const current = draft.finalizations[sessionId]
    if (current) draft.finalizations[sessionId] = { ...current, ...patch }
  })
}
/** Session done: active → finalizing → completed through four staged steps; one finalization per command. */
export async function finalizeSession(
  input: FinalizeSessionInput,
): Promise<SaveOutcome & { data: SessionFinalization }> {
  const { sessionId, commandId } = input
  if (!commandId.trim()) throw new MockError('permission', 'A confirmation ID is required.')
  await delay()
  const snapshot = readMockState(),
    session = sessionIn(snapshot, sessionId),
    existing = snapshot.finalizations[sessionId]
  // Idempotency: a replay never starts a second finalization, whatever state the first is in.
  if (existing && existing.commandId === commandId) {
    if (existing.state === 'running' || existing.state === 'done')
      return { savedOffline: false, message: DONE_TOAST, data: { ...existing } }
    if (existing.state === 'committed')
      return run(sessionId, commandId, session.title, existing.failedStage ?? 'slides', input)
  } else if (existing && existing.state !== 'failed') {
    throw new MockError('conflict', 'This session is already being finished on another device.')
  }
  if (session.state !== 'active')
    throw new MockError('permission', 'Only a running session can be finished.')
  const blocked = sessionDoneBlocker(snapshot, sessionId)
  if (blocked) throw blocked
  return run(sessionId, commandId, session.title, 'checking', input)
}
const DONE_TOAST = 'Session finished · player records updated'
const doneLogText = (title: string) => `${title} finished · player records updated`
async function run(
  sessionId: string,
  commandId: string,
  title: string,
  from: FinalizationStage,
  input: FinalizeSessionInput,
): Promise<SaveOutcome & { data: SessionFinalization }> {
  const generation = mockStore.getGeneration(),
    failAt = input.failAtStage ?? 'checking',
    stages = FINALIZATION_STAGES.slice(FINALIZATION_STAGES.indexOf(from))
  mockStore.update((draft) => {
    const s = sessionIn(draft, sessionId)
    if (s.state === 'active') s.state = 'finalizing'
    draft.finalizations[sessionId] = { sessionId, commandId, state: 'running', stage: from }
  })
  let outcome: SaveOutcome = { savedOffline: false, message: DONE_TOAST }
  for (const stage of stages) {
    setFinalization(sessionId, { stage, state: 'running' })
    await delay(STAGE_DELAY)
    if (generation !== mockStore.getGeneration())
      throw new MockError('conflict', 'Demo data was reset. Review the session again.')
    try {
      // Before commit the integrity gates are rechecked; the dev toggle is consumed at its chosen stage.
      if (stage === 'checking' || stage === 'finishing') {
        const blocked = sessionDoneBlocker(readMockState(), sessionId)
        if (blocked) throw blocked
      }
      if (stage === failAt) checkMockSave()
    } catch (error) {
      const committed = stage === 'player_records' || stage === 'slides'
      mockStore.update((draft) => {
        const s = sessionIn(draft, sessionId),
          f = draft.finalizations[sessionId]
        if (!committed && s.state === 'finalizing') s.state = 'active'
        if (f) {
          f.state = committed ? 'committed' : 'failed'
          f.failedStage = stage
        }
      })
      throw error
    }
    if (stage === 'finishing')
      mockStore.update((draft) => {
        const s = sessionIn(draft, sessionId),
          now = Date.now()
        s.state = 'completed'
        s.finalizedAt = now
        const f = draft.finalizations[sessionId]
        if (f) f.state = 'committed'
      })
    if (stage === 'player_records')
      mockStore.update((draft) => {
        sessionIn(draft, sessionId).playerRecordsUpdatedAt = Date.now()
      })
    // Preparing result slides: the private snapshot (standings + prototype reference awards) is generated here.
    if (stage === 'slides')
      mockStore.update((draft) => {
        draft.resultSnapshots[sessionId] = createResultSnapshot({
          sessionId,
          roster: draft.roster,
          matches: draft.matches,
          history: draft.awardHistory,
          players: draft.clubPlayers,
          generatedAt: Date.now(),
        })
      })
  }
  mockStore.update((draft) => {
    draft.finalizations[sessionId] = { sessionId, commandId, state: 'done', stage: 'slides' }
    outcome = recordChange(draft, { text: doneLogText(title), area: 'Session done' })
  })
  const data = readMockState().finalizations[sessionId]
  if (!data) throw new Error('Finalization produced no record.')
  return { ...outcome, message: DONE_TOAST, data }
}
/**
 * Marks the session invalid: no official result, no result facts, no slides.
 * Open item "Releasing the active-session slot after invalidation" (docs/screens/product/open-decisions.md):
 * only the state changes here; the one-active-session check already counts only active sessions.
 */
export function invalidateSession(input: { sessionId: string; reason: string }) {
  return queueMutation({ area: 'Session done', sessionId: input.sessionId }, (state) => {
    const s = sessionIn(state, input.sessionId)
    if (s.state !== 'active')
      throw new MockError('permission', 'Only a running session can be marked invalid.')
    if (state.finalizations[input.sessionId]?.state === 'running')
      throw new MockError('conflict', 'This session is being finished. Wait for it to end.')
    if (!input.reason.trim())
      throw new MockError('permission', 'Give the reason this session is invalid.')
    s.state = 'invalid'
    s.invalidReason = input.reason.trim()
    s.finalizedAt = null
    s.playerRecordsUpdatedAt = null
    state.resultSnapshots = Object.fromEntries(
      Object.entries(state.resultSnapshots).filter(([id]) => id !== input.sessionId),
    )
    state.finalizations = Object.fromEntries(
      Object.entries(state.finalizations).filter(([id]) => id !== input.sessionId),
    )
    return { data: s, text: `${s.title} marked invalid · no official result` }
  })
}
