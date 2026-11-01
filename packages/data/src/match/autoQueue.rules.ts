import type { QueueSession } from '../queue-session/queueSession.types'
import type { MatchLineup } from './match.types'
import { splitTeams } from './queue.rules'
import type { AutoQueueDraftLineup, AutoQueueDraftState, AutoQueueMode } from './autoQueue.types'
import { activeMatchFor, allPlayers, countedGames, queuedCount, waitMinutes, type MatchContext } from './match.rules'

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

/** Owner-reviewed load/order rules from generateDrafts in the canonical prototype.
 * Only splitTeams retains the earlier, explicitly labelled team-balancing reference heuristic.
 */
export function generateAutoQueueMatches({ session, ctx, mode, limit, retained = [], now = Date.now(), rng = Math.random }: {
  session: QueueSession
  ctx: MatchContext
  mode: Exclude<AutoQueueMode, 'catchup'>
  limit: number
  retained?: MatchLineup[]
  now?: number
  rng?: () => number
}): { matches: MatchLineup[]; stopReason: string; error: string | null } {
  const players = ctx.roster.filter((p) => p.sessionId === session.id && p.present && (mode === 'ahead' || !activeMatchFor(p.id, ctx.matches)))
  if (!session.allowSingles && !session.allowDoubles)
    return { matches: [], stopReason: '', error: 'Singles and doubles are both off for this session. Add a fun game manually instead.' }
  const played = new Map(players.map((p) => [p.id, countedGames(p.id, ctx.matches)]))
  const load = new Map(players.map((p) => [p.id, (played.get(p.id) ?? 0) + queuedCount(p.id, ctx.matches) + retained.filter((m) => allPlayers(m).includes(p.id)).length]))
  const order = new Map(players.map((p, i) => [p.id, i]))
  const matches: MatchLineup[] = []
  for (let i = 0; i < limit; i++) {
    const format = session.allowSingles && session.allowDoubles
      ? players.length >= 4 && i % 3 !== 2 ? 'doubles' : 'singles'
      : session.allowDoubles ? 'doubles' : 'singles'
    const size = format === 'doubles' ? 4 : 2
    if (players.length < size)
      return { matches: [], stopReason: '', error: `Only ${players.length} available player${players.length === 1 ? '' : 's'}. ${format === 'doubles' ? 'Doubles' : 'Singles'} needs ${size}. Mark arrivals present in Players.` }
    const sorted = [...players].sort((a, b) => {
      const wait = waitMinutes(b, ctx.matches, session.startedAt, now) - waitMinutes(a, ctx.matches, session.startedAt, now)
      const left = load.get(a.id) ?? 0, right = load.get(b.id) ?? 0
      const priority = mode === 'wait'
        ? (left - (played.get(a.id) ?? 0)) - (right - (played.get(b.id) ?? 0)) || wait
        : mode === 'ahead'
          ? Number(!!activeMatchFor(a.id, ctx.matches)) - Number(!!activeMatchFor(b.id, ctx.matches)) || left - right
          : left - right
      return priority || wait || (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0)
    })
    const pick = sorted.slice(0, size)
    matches.push(splitTeams(session, pick, format, rng))
    for (const p of pick) load.set(p.id, (load.get(p.id) ?? 0) + 1)
  }
  return { matches, stopReason: 'Selected batch limit reached.', error: null }
}
