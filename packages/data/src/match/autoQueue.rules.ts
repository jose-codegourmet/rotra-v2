import type { QueueSession } from '../queue-session/queueSession.types'
import type { AutoQueueDraftLineup, AutoQueueDraftState, AutoQueueMode } from './autoQueue.types'
import { activeMatchFor, allPlayers, countedGames, queuedCount, type MatchContext } from './match.rules'

export const AUTO_QUEUE_MODES: AutoQueueMode[] = ['available', 'ahead', 'wait', 'fewest', 'catchup']
export function emptyAutoQueueDraftState(): AutoQueueDraftState {
  return { batches: {}, selectedIds: [], committedIds: [] }
}
export function allAutoQueueDrafts(state: AutoQueueDraftState) {
  return AUTO_QUEUE_MODES.flatMap((mode) => state.batches[mode]?.drafts ?? [])
}
/** Clock ticks do not stale a batch; changes to its source records do. */
export function autoQueueFingerprint(session: QueueSession, ctx: MatchContext) {
  return JSON.stringify([
    session.state, session.allowSingles, session.allowDoubles, session.sessionMode,
    session.startedAt, session.scheduledStartAt, session.scheduledEndAt,
    ctx.roster, ctx.matches, ctx.courts,
  ])
}
export function autoQueuePlayerCounts(id: string, ctx: MatchContext, drafts: AutoQueueDraftLineup[]) {
  return {
    played: countedGames(id, ctx.matches),
    queued: queuedCount(id, ctx.matches),
    suggested: drafts.filter((d) => allPlayers(d).includes(id)).length,
    playingNow: !!activeMatchFor(id, ctx.matches),
  }
}
export function selectAutoQueueDraft(state: AutoQueueDraftState, id: string, selected: boolean) {
  if (!allAutoQueueDrafts(state).some((d) => d.id === id)) return
  if (selected && !state.selectedIds.includes(id)) state.selectedIds.push(id)
  if (!selected) state.selectedIds = state.selectedIds.filter((current) => current !== id)
}
export function clearAutoQueueDrafts(state: AutoQueueDraftState, mode: AutoQueueMode, unselectedOnly: boolean) {
  const batch = state.batches[mode]
  if (!batch) return
  batch.drafts = unselectedOnly ? batch.drafts.filter((d) => state.selectedIds.includes(d.id)) : []
  const remaining = new Set(allAutoQueueDrafts(state).map((d) => d.id))
  state.selectedIds = state.selectedIds.filter((id) => remaining.has(id))
  delete batch.stopReason
}
