import {
  allAutoQueueDrafts,
  autoQueueDraftConflict,
  autoQueueFingerprint,
  type BaggingEdit,
  clearAutoQueueDrafts,
  editBagging,
  emptyAutoQueueDraftState,
  generateAutoQueueMatches,
  selectAutoQueueDraft,
} from '../match/autoQueue.rules'
import type { AutoQueueCount, AutoQueueDraftState, AutoQueueMode } from '../match/autoQueue.types'
import type { MatchContext } from '../match/match.rules'
import { MockError } from '../mock/errors'
import { matchOf, queueCommand, readQueue, type WireMatch } from './match'
import { accepted, realGetQueueSession, realGetSessionRoster } from './queue'

/**
 * Real-mode Auto queue drafts (Q-QUEUE › Auto queue). Drafts are a working set that never creates
 * match numbers, accepted assignments or sync entries, so, as in the mock, they are kept on this
 * device only: one module-level working set per session, built from the saved session, roster and
 * matches and generated with the same pure rules (`generateAutoQueueMatches`). Those rules carry
 * the prototype's draft-mode weights, still pending the queue-generation decision (#247). The
 * working set is lost on reload. Add to Main Queue is the only write: the reviewed lineups go to the matches
 * Route Handler as `source: 'auto'`, each keyed on its own draft ID.
 */
const workingSets = new Map<string, AutoQueueDraftState>()

const stateOf = (sessionId: string) => {
  let state = workingSets.get(sessionId)
  if (!state) {
    state = emptyAutoQueueDraftState()
    workingSets.set(sessionId, state)
  }
  return state
}
/** A copy, so the screen's query sees a new value after every change. */
const shown = (state: AutoQueueDraftState): AutoQueueDraftState => structuredClone(state)

/**
 * The saved inputs the screen also reads. The queue is read first: its revisions then never claim
 * a newer roster or session than the one checked, so a change in between is a conflict on save.
 */
async function savedInputs(sessionId: string) {
  const read = await readQueue(sessionId)
  const [session, { roster }] = await Promise.all([
    realGetQueueSession(sessionId),
    realGetSessionRoster(sessionId),
  ])
  const ctx: MatchContext = {
    roster,
    matches: [...read.matches].sort((a, b) => a.queuePosition - b.queuePosition),
    courts: session.courts,
  }
  return { read, session, ctx }
}

function requireLive(session: { state: string }) {
  if (session.state !== 'active') throw new MockError('permission', 'Start the session first.')
}

export async function realGetAutoQueueDrafts(sessionId: string) {
  const { session, ctx } = await savedInputs(sessionId)
  return { ...shown(stateOf(sessionId)), fingerprint: autoQueueFingerprint(session, ctx) }
}

export async function realEditAutoQueueDrafts(
  input: { sessionId: string } & (
    | { action: 'select'; draftId: string; selected: boolean }
    | { action: 'unselect-all' }
    | { action: 'clear'; mode: AutoQueueMode; unselectedOnly: boolean }
    | BaggingEdit
  ),
) {
  requireLive(await realGetQueueSession(input.sessionId))
  const state = stateOf(input.sessionId)
  if (input.action === 'select') selectAutoQueueDraft(state, input.draftId, input.selected)
  else if (input.action === 'unselect-all') state.selectedIds = []
  else if (input.action === 'clear') clearAutoQueueDrafts(state, input.mode, input.unselectedOnly)
  else {
    // Bagging mode and its pairs (#739) live with the drafts: on this device only, never saved.
    try {
      editBagging(state.bagging, input)
    } catch (error) {
      throw new MockError('conflict', error instanceof Error ? error.message : 'Try again.')
    }
  }
  return shown(state)
}

const REASONS = (catchUpTarget?: number): Record<AutoQueueMode, string> => ({
  available: 'Available players with the lowest planned load',
  ahead: 'Available players first, then present players still playing',
  wait: 'Longest wait after planned assignments',
  fewest: 'Fewest games after planned assignments',
  catchup: `Below the chosen completed-game target of ${catchUpTarget}`,
})

export async function realGenerateAutoQueueDrafts(input: {
  sessionId: string
  mode: AutoQueueMode
  catchUpTarget?: number
  count: AutoQueueCount
  preserveSelected?: boolean
}) {
  if (![2, 3, 4, 6].includes(input.count))
    throw new MockError('permission', 'Choose 2, 3, 4 or 6 matches.')
  const { session, ctx } = await savedInputs(input.sessionId)
  requireLive(session)
  const state = stateOf(input.sessionId),
    old = state.batches[input.mode]?.drafts ?? []
  const retained = input.preserveSelected ? old.filter((d) => state.selectedIds.includes(d.id)) : []
  const result = generateAutoQueueMatches({
    session,
    ctx,
    mode: input.mode,
    limit: Math.max(0, input.count - retained.length),
    retained,
    catchUpTarget: input.catchUpTarget,
    bagging: state.bagging,
  })
  if (result.error) throw new MockError('permission', result.error)
  const fingerprint = autoQueueFingerprint(session, ctx)
  const reason = REASONS(input.catchUpTarget)[input.mode]
  state.batches[input.mode] = {
    drafts: [
      ...retained,
      ...result.matches.map((m) => ({
        ...m,
        id: crypto.randomUUID(),
        mode: input.mode,
        reason: m.reason ?? reason,
        fingerprint,
      })),
    ],
    stopReason: result.stopReason,
    ...(input.mode === 'catchup' ? { catchUpTarget: input.catchUpTarget } : {}),
  }
  const remaining = new Set(allAutoQueueDrafts(state).map((d) => d.id))
  state.selectedIds = state.selectedIds.filter((id) => remaining.has(id))
  return shown(state)
}

/**
 * Add to Main Queue. The drafts are checked against a fresh read first (a draft that needs
 * attention is a conflict with its reason, nothing is sent), then saved in one command with that
 * read's revisions, so anything changed since is the server's conflict, never a silent add. Each
 * draft's own ID is its operation ID: a retry after a lost reply returns the matches already saved.
 */
export async function realTransferAutoQueueDrafts(input: {
  sessionId: string
  draftIds: string[]
  operationId: string
}) {
  if (!input.operationId.trim()) throw new MockError('permission', 'A confirmation ID is required.')
  const state = stateOf(input.sessionId)
  if (!input.draftIds.length || new Set(input.draftIds).size !== input.draftIds.length)
    throw new MockError('conflict', 'Review a non-empty selection of different drafts.')
  const all = allAutoQueueDrafts(state)
  const { read, session, ctx } = await savedInputs(input.sessionId)
  requireLive(session)
  const drafts = input.draftIds.map((id) => {
    if (state.committedIds.includes(id))
      throw new MockError('conflict', 'This draft was already added to Main Queue.')
    const draft = all.find((d) => d.id === id)
    if (!draft) throw new MockError('conflict', 'Drafts changed. Review them again.')
    const conflict = autoQueueDraftConflict(draft, session, ctx)
    if (conflict) throw new MockError('conflict', conflict)
    return draft
  })
  const saved = await queueCommand<WireMatch[]>(input.sessionId, '/matches', {
    body: {
      source: 'auto',
      drafts: drafts.map((d) => ({
        operationId: d.id,
        mode: d.mode,
        lineup: { format: d.format, teamA: d.teamA, teamB: d.teamB },
      })),
      expectedQueueRevision: read.queueRevision,
      expectedRevision: read.revision,
    },
  })
  for (const batch of Object.values(state.batches))
    if (batch) {
      batch.drafts = batch.drafts.filter((d) => !input.draftIds.includes(d.id))
      if (!batch.drafts.length) delete batch.stopReason
    }
  state.selectedIds = state.selectedIds.filter((id) => !input.draftIds.includes(id))
  state.committedIds.push(...input.draftIds)
  const matches = saved.map(matchOf)
  return accepted(
    matches,
    `${matches.length} draft${matches.length === 1 ? '' : 's'} added to Main Queue`,
  )
}
