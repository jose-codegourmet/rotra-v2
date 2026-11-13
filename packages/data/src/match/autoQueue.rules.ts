import type { QueueSession } from '../queue-session/queueSession.types'
import type { SessionPlayer } from '../session-roster/sessionRoster.types'
import type {
  AutoQueueDraftLineup,
  AutoQueueDraftState,
  AutoQueueMode,
  BaggingGames,
  BaggingPair,
  BaggingSettings,
} from './autoQueue.types'
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
  return { batches: {}, selectedIds: [], committedIds: [], bagging: emptyBaggingSettings() }
}
export function emptyBaggingSettings(): BaggingSettings {
  return { enabled: false, pairs: [] }
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

/* Bagging mode and bagging pairs (#739, D-2026-11-11-11). Doubles only, one switch for the session,
 * Queue Master only. A pair guides Generate matches in every tab; Auto Queue (court filling), Suggest,
 * Add match and Make match never read it. The pair wins over fairness and level balance; court
 * capacity still wins over the pair. */

/** Players present per page in the Add bagging pair sheet (D-BAGGING-PAIR). */
export const BAGGING_PAGE_SIZE = 24

/** The pair's game numbers, 1 to the session minimum; `all` is an empty pick. */
export function baggingGameNumbers(games: BaggingGames) {
  return games === 'all' ? [] : games
}
/**
 * Tap ALL, or a game number on or off. Picking every number from 1 to the minimum, or none, falls
 * back to ALL (owner comment, November 11, 2026).
 */
export function toggleBaggingGame(
  games: BaggingGames,
  value: 'all' | number,
  minimumGames: number,
): BaggingGames {
  if (value === 'all') return 'all'
  const current = baggingGameNumbers(games)
  const next = current.includes(value)
    ? current.filter((n) => n !== value)
    : [...current, value].sort((x, y) => x - y)
  return next.length === 0 || next.length >= Math.max(1, minimumGames) ? 'all' : next
}
/** The pair another pair already holds one of these players in, if any. */
export function baggingPairWith(pairs: BaggingPair[], playerId: string) {
  return pairs.find((pair) => pair.a === playerId || pair.b === playerId)
}
/**
 * A pair's next game together, counted on games actually played (the lower of the two players'
 * games played, with the Queue Master's games played adjustment, plus 1), never on drafts. It
 * applies when that number is picked, or always under ALL; games past the minimum count only under ALL.
 */
export function baggingPairApplies(
  pair: BaggingPair,
  ctx: Pick<MatchContext, 'roster' | 'matches'>,
  minimumGames: number,
) {
  if (pair.games === 'all') return true
  const next = Math.min(gamesPlayedFor(pair.a, ctx), gamesPlayedFor(pair.b, ctx)) + 1
  return next <= Math.max(1, minimumGames) && pair.games.includes(next)
}
/** The pairs Generate matches follows right now: none while the switch is off or the session has no doubles. */
export function activeBaggingPairs(
  bagging: BaggingSettings | undefined,
  session: Pick<QueueSession, 'allowDoubles' | 'minimumGames'>,
  ctx: Pick<MatchContext, 'roster' | 'matches'>,
) {
  if (!bagging?.enabled || !session.allowDoubles) return []
  return bagging.pairs.filter((pair) => baggingPairApplies(pair, ctx, session.minimumGames))
}
export type BaggingEdit =
  | { action: 'bagging-enabled'; enabled: boolean }
  | { action: 'bagging-add'; a: string; b: string; games: BaggingGames; id?: string }
  | { action: 'bagging-games'; pairId: string; games: BaggingGames }
  | { action: 'bagging-remove'; pairId: string }
/**
 * Edit the switch or the list. A player is in one pair at a time: adding a pair removes any pair
 * either player was in (Replace pair). There is no limit on pairs. Switching off keeps the list.
 * Returns the pair added or removed, for the toast.
 */
export function editBagging(bagging: BaggingSettings, edit: BaggingEdit): BaggingPair | undefined {
  if (edit.action === 'bagging-enabled') {
    bagging.enabled = edit.enabled
    return
  }
  if (edit.action === 'bagging-add') {
    if (!edit.a || !edit.b || edit.a === edit.b) throw new Error('Pick two different players.')
    bagging.pairs = bagging.pairs.filter(
      (pair) => ![edit.a, edit.b].some((id) => pair.a === id || pair.b === id),
    )
    const pair: BaggingPair = {
      id: edit.id ?? `bagging-${crypto.randomUUID()}`,
      a: edit.a,
      b: edit.b,
      games: edit.games,
    }
    bagging.pairs.push(pair)
    return pair
  }
  const pair = bagging.pairs.find((current) => current.id === edit.pairId)
  if (!pair) throw new Error('That pair was already removed.')
  if (edit.action === 'bagging-games') {
    pair.games = edit.games
    return pair
  }
  bagging.pairs = bagging.pairs.filter((current) => current.id !== edit.pairId)
  return pair
}
/** The draft tile's reason for a lineup a pair shaped: "Bagging pair: A and B are partners". */
export function baggingReason(pairs: BaggingPair[], roster: SessionPlayer[]) {
  const name = (id: string) => {
    const player = roster.find((p) => p.id === id)
    return player ? shortName(player) : 'Player'
  }
  return `Bagging pair: ${pairs.map((pair) => `${name(pair.a)} and ${name(pair.b)}`).join(', ')} are partners`
}
/**
 * Keep applicable pairs together in one doubles pick. If exactly one of a pair is picked and the
 * partner is free (eligible in this tab and not in a draft of this batch), the partner replaces the
 * last picked player who is not in a pair himself. Court capacity wins: nobody is added past four.
 */
function fillBaggingPartners(
  pick: SessionPlayer[],
  pairs: BaggingPair[],
  free: SessionPlayer[],
): SessionPlayer[] {
  let out = [...pick]
  const paired = (id: string) => pairs.some((pair) => pair.a === id || pair.b === id)
  for (const pair of pairs) {
    const inPick = [pair.a, pair.b].filter((id) => out.some((p) => p.id === id))
    if (inPick.length !== 1) continue
    const partnerId = inPick[0] === pair.a ? pair.b : pair.a
    const partner = free.find((p) => p.id === partnerId)
    if (!partner) continue
    const drop = [...out].reverse().find((p) => p.id !== inPick[0] && !paired(p.id))
    if (drop) out = out.map((p) => (p.id === drop.id ? partner : p))
  }
  return out
}
/** Put each applicable pair in the lineup on one team, swapping the partner across if needed. */
function partnerBaggingTeams(lineup: MatchLineup, pairs: BaggingPair[]) {
  let { teamA, teamB } = lineup
  const kept: BaggingPair[] = []
  for (const pair of pairs) {
    const all = [...teamA, ...teamB]
    if (!all.includes(pair.a) || !all.includes(pair.b)) continue
    kept.push(pair)
    if (teamA.includes(pair.a) === teamA.includes(pair.b)) continue
    const aInA = teamA.includes(pair.a)
    const mine = aInA ? teamA : teamB,
      other = aInA ? teamB : teamA
    const swapOut = mine.find((id) => id !== pair.a)
    const nextMine = mine.map((id) => (id === swapOut ? pair.b : id)),
      nextOther = other.map((id) => (id === pair.b ? (swapOut ?? id) : id))
    teamA = aInA ? nextMine : nextOther
    teamB = aInA ? nextOther : nextMine
  }
  return { lineup: { ...lineup, teamA, teamB }, kept }
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
  bagging,
}: {
  session: QueueSession
  ctx: MatchContext
  mode: AutoQueueMode
  catchUpTarget?: number
  limit: number
  retained?: MatchLineup[]
  now?: number
  rng?: () => number
  /** Bagging mode and its pairs (#739); ignored while off or without doubles. */
  bagging?: BaggingSettings
}): {
  /** `reason` is set only when a bagging pair shaped the lineup. */
  matches: (MatchLineup & { reason?: string })[]
  stopReason: string
  error: string | null
  remainingShortfall?: number
} {
  const pool = ctx.roster.filter(
    (p) =>
      p.sessionId === session.id &&
      p.present &&
      (mode === 'ahead' || !activeMatchFor(p.id, ctx.matches)),
  )
  // D-2026-11-13-07: a player already in a waiting match in the Main Queue is never available.
  const players = pool.filter((p) => !queuedCount(p.id, ctx.matches))
  const inQueue = pool.length - players.length
  /** Appended when the batch is short and queued players were left out. */
  const queuedNote = (text: string, made: number) =>
    made < limit && inQueue
      ? `${text.replace(/\.$/, '')} · ${inQueue} player${inQueue === 1 ? ' is' : 's are'} already in the Main Queue`
      : text
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
  const pairs = activeBaggingPairs(bagging, session, ctx)
  let stopReason = ''
  const matches: (MatchLineup & { reason?: string })[] = []
  // A player already in a draft of this batch (kept or new) is not free for a pair.
  const drafted = () => new Set([...retained, ...matches].flatMap(allPlayers))
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
        error: queuedNote(
          `Made 0 of ${limit}: not enough ${mode === 'ahead' ? 'present' : 'free'} players for another match.`,
          0,
        ),
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
    let chosen = pick
    let reason: string | undefined
    if (format === 'doubles' && pairs.length) {
      const taken = drafted()
      const free = sorted.filter((p) => !taken.has(p.id))
      // The pair beats fairness (owner answer, November 11, 2026): an applicable pair with both
      // players free leads the next doubles draft.
      const lead = pairs.find(
        (pair) => free.some((p) => p.id === pair.a) && free.some((p) => p.id === pair.b),
      )
      const seeded = lead
        ? [
            ...free.filter((p) => p.id === lead.a || p.id === lead.b),
            ...sorted.filter((p) => p.id !== lead.a && p.id !== lead.b).slice(0, size - 2),
          ]
        : pick
      chosen = fillBaggingPartners(seeded, pairs, free)
      const teamed = partnerBaggingTeams(splitTeams(session, chosen, format, rng), pairs)
      if (teamed.kept.length) reason = baggingReason(teamed.kept, ctx.roster)
      matches.push(reason ? { ...teamed.lineup, reason } : teamed.lineup)
    } else matches.push(splitTeams(session, pick, format, rng))
    for (const p of chosen) load.set(p.id, (load.get(p.id) ?? 0) + 1)
  }
  stopReason ||= `Made ${matches.length} of ${limit} match${limit === 1 ? '' : 'es'}.`
  if (mode === 'catchup') {
    const remainingShortfall = shortfall()
    if (players.length && remainingShortfall === 0)
      stopReason = `Everyone available reaches ${target} game${target === 1 ? '' : 's'} with these matches.`
    return {
      matches,
      stopReason: queuedNote(
        `${stopReason}${remainingShortfall > 0 ? ` ${remainingShortfall} more game${remainingShortfall === 1 ? ' is' : 's are'} still needed to reach ${target}.` : ''}`,
        matches.length,
      ),
      remainingShortfall,
      error: null,
    }
  }
  return { matches, stopReason: queuedNote(stopReason, matches.length), error: null }
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
