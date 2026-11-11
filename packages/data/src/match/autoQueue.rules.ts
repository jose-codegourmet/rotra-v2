import type { QueueSession } from '../queue-session/queueSession.types'
import type { AutoQueueDraftLineup, AutoQueueDraftState, AutoQueueMode } from './autoQueue.types'
import {
  activeMatchFor,
  allPlayers,
  completeLineup,
  gamesPlayed,
  gamesPlayedFor,
  type MatchContext,
  queuedCount,
  shortName,
  waitMinutes,
} from './match.rules'
import type { MatchLineup } from './match.types'
import { splitTeams } from './queue.rules'

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
    session.state,
    session.allowSingles,
    session.allowDoubles,
    session.sessionMode,
    session.startedAt,
    session.scheduledStartAt,
    session.scheduledEndAt,
    ctx.roster,
    ctx.matches,
    ctx.courts,
  ])
}
export function autoQueuePlayerCounts(
  id: string,
  ctx: MatchContext,
  drafts: AutoQueueDraftLineup[],
) {
  return {
    played: gamesPlayedFor(id, ctx),
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
export function clearAutoQueueDrafts(
  state: AutoQueueDraftState,
  mode: AutoQueueMode,
  unselectedOnly: boolean,
) {
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
export function generateAutoQueueMatches({
  session,
  ctx,
  mode,
  limit,
  retained = [],
  now = Date.now(),
  rng = Math.random,
  catchUpTarget,
}: {
  session: QueueSession
  ctx: MatchContext
  mode: AutoQueueMode
  catchUpTarget?: number
  limit: number
  retained?: MatchLineup[]
  now?: number
  rng?: () => number
}): {
  matches: MatchLineup[]
  stopReason: string
  error: string | null
  remainingShortfall?: number
} {
  const players = ctx.roster.filter(
    (p) =>
      p.sessionId === session.id &&
      p.present &&
      (mode === 'ahead' || !activeMatchFor(p.id, ctx.matches)),
  )
  if (!session.allowSingles && !session.allowDoubles)
    return {
      matches: [],
      stopReason: '',
      error: 'Singles and doubles are both off for this session. Add a fun game manually instead.',
    }
  if (mode === 'catchup' && (!Number.isSafeInteger(catchUpTarget) || (catchUpTarget ?? 0) < 1))
    return {
      matches: [],
      stopReason: '',
      error: 'Enter a whole number of games, 1 or more.',
    }
  const target = catchUpTarget ?? 0
  const played = new Map(players.map((p) => [p.id, gamesPlayed(p, ctx.matches)]))
  const load = new Map(
    players.map((p) => [
      p.id,
      (played.get(p.id) ?? 0) +
        queuedCount(p.id, ctx.matches) +
        retained.filter((m) => allPlayers(m).includes(p.id)).length,
    ]),
  )
  const order = new Map(players.map((p, i) => [p.id, i]))
  const shortfall = () =>
    players.reduce((sum, p) => sum + Math.max(0, target - (load.get(p.id) ?? 0)), 0)
  let stopReason = ''
  const matches: MatchLineup[] = []
  for (let i = 0; i < limit; i++) {
    if (mode === 'catchup' && players.length && shortfall() === 0) {
      stopReason = `Everyone available reaches ${target} game${target === 1 ? '' : 's'} with these matches.`
      break
    }
    const format =
      session.allowSingles && session.allowDoubles
        ? players.length >= 4 && i % 3 !== 2
          ? 'doubles'
          : 'singles'
        : session.allowDoubles
          ? 'doubles'
          : 'singles'
    const size = format === 'doubles' ? 4 : 2
    if (players.length < size && mode === 'catchup') {
      stopReason = `Made ${matches.length} of ${limit}: not enough free players for another match.`
      break
    }
    if (players.length < size)
      return {
        matches: [],
        stopReason: '',
        error: `Made 0 of ${limit}: not enough ${mode === 'ahead' ? 'present' : 'free'} players for another match.`,
      }
    const sorted = [...players].sort((a, b) => {
      const wait =
        waitMinutes(b, ctx.matches, session.startedAt, now) -
        waitMinutes(a, ctx.matches, session.startedAt, now)
      const left = load.get(a.id) ?? 0,
        right = load.get(b.id) ?? 0
      const priority =
        mode === 'catchup'
          ? Number(left >= target) - Number(right >= target) || left - right
          : mode === 'wait'
            ? left - (played.get(a.id) ?? 0) - (right - (played.get(b.id) ?? 0)) || wait
            : mode === 'ahead'
              ? Number(!!activeMatchFor(a.id, ctx.matches)) -
                  Number(!!activeMatchFor(b.id, ctx.matches)) || left - right
              : left - right
      return priority || wait || (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0)
    })
    const pick = sorted.slice(0, size)
    if (mode === 'catchup' && !pick.some((p) => (load.get(p.id) ?? 0) < target)) {
      stopReason = `Made ${matches.length} of ${limit}: no other match helps anyone reach ${target} game${target === 1 ? '' : 's'}.`
      break
    }
    matches.push(splitTeams(session, pick, format, rng))
    for (const p of pick) load.set(p.id, (load.get(p.id) ?? 0) + 1)
  }
  stopReason ||= `Made ${matches.length} of ${limit} match${limit === 1 ? '' : 'es'}.`
  if (mode === 'catchup') {
    const remainingShortfall = shortfall()
    if (players.length && remainingShortfall === 0)
      stopReason = `Everyone available reaches ${target} game${target === 1 ? '' : 's'} with these matches.`
    return {
      matches,
      stopReason: `${stopReason}${remainingShortfall > 0 ? ` ${remainingShortfall} more game${remainingShortfall === 1 ? ' is' : 's are'} still needed to reach ${target}.` : ''}`,
      remainingShortfall,
      error: null,
    }
  }
  return { matches, stopReason, error: null }
}

/** Revalidate source facts without silently replacing a selected lineup. Courts are claimed only by Start match. */
export function autoQueueDraftConflict(
  draft: AutoQueueDraftLineup,
  session: QueueSession,
  ctx: MatchContext,
) {
  if (!completeLineup(draft))
    return 'Lineup is incomplete or repeats a player. Regenerate this draft.'
  if (draft.format !== 'singles' && draft.format !== 'doubles')
    return 'Add a fun game manually instead.'
  if (
    (draft.format === 'singles' && !session.allowSingles) ||
    (draft.format === 'doubles' && !session.allowDoubles)
  )
    return `${draft.format === 'singles' ? 'Singles' : 'Doubles'} is off for this session.`
  for (const id of allPlayers(draft)) {
    const player = ctx.roster.find((p) => p.id === id && p.sessionId === session.id)
    if (!player || !player.present)
      return `${player ? shortName(player) : 'A player'} is not present. Restore presence or regenerate the draft.`
    if (draft.mode !== 'ahead' && activeMatchFor(id, ctx.matches))
      return `${shortName(player)} is now playing. This draft needs attention; use Plan Ahead or regenerate when they are free.`
  }
  return null
}
