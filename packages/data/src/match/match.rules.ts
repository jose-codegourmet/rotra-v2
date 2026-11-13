import type { QueueSession, SessionCourt } from '../queue-session/queueSession.types'
import { shortName } from '../session-roster/sessionRoster.rules'
import type { SessionPlayer } from '../session-roster/sessionRoster.types'
import type {
  Match,
  MatchFormat,
  MatchLineup,
  MatchStatus,
  SubstitutionCredit,
} from './match.types'

export { shortName } from '../session-roster/sessionRoster.rules'
export const FORMAT_TEAM_SIZES: Record<MatchFormat, readonly [number, number]> = {
  singles: [1, 1],
  doubles: [2, 2],
  fun_1v2: [1, 2],
  fun_3v3: [3, 3],
  fun_4v4: [4, 4],
  fun_5v5: [5, 5],
}
export const FORMAT_LABELS: Record<MatchFormat, string> = {
  singles: 'Singles',
  doubles: 'Doubles',
  fun_1v2: '1v2 fun',
  fun_3v3: '3v3 fun',
  fun_4v4: '4v4 fun',
  fun_5v5: '5v5 fun',
}
export const allPlayers = (m: MatchLineup) => [...m.teamA, ...m.teamB]
export const courtsNeeded = (m: Pick<Match, 'format'>) => (m.format === 'fun_5v5' ? 2 : 1)
/** On court (placed, not started) and Playing matches hold their courts; their players are busy. */
export const holdsCourt = (m: Pick<Match, 'state'>) =>
  m.state === 'on_court' || m.state === 'active'
/**
 * The On court or Playing match a player is busy in ("Migs is on Court 1"), ignoring `exceptId`
 * (an On court match rechecking its own players before Start match).
 */
export const activeMatchFor = (id: string, matches: Match[], exceptId?: string) =>
  matches.find((m) => m.id !== exceptId && holdsCourt(m) && allPlayers(m).includes(id))
/** Open from its planned start, or from when it was opened early. A court without a start is open. */
export const courtOpen = (c: SessionCourt, now = Date.now()) =>
  (c.openedEarlyAt ?? c.startsAt ?? 0) <= now
/** Opened early and still before its planned start; afterwards the early open is just history. */
export const openedEarly = (c: SessionCourt, now = Date.now()) =>
  c.openedEarlyAt != null && (c.startsAt ?? 0) > now
export const freeCourts = (courts: SessionCourt[], matches: Match[], now = Date.now()) =>
  courts.filter(
    (c) =>
      !c.removedAt &&
      courtOpen(c, now) &&
      !matches.some((m) => holdsCourt(m) && m.courtIds.includes(c.id)),
  )
/**
 * When a free court became free (the prototype's freeSince): the latest end of a match that started
 * on it by `now`, or null when nothing has played there yet (the caller falls back to the court's
 * opening time). A match still on the court has no end.
 */
export function courtFreeSince(courtId: string, matches: Match[], now = Date.now()) {
  const ends = matches
    .filter((m) => m.courtIds.includes(courtId) && m.startedAt != null && m.startedAt <= now)
    .map((m) => m.endedAt ?? Number.POSITIVE_INFINITY)
    .filter((end) => end <= now)
  return ends.length ? Math.max(...ends) : null
}
/** Whole minutes a court has been free ("Free · N min"); null when unknown or not yet free. */
export const freeCourtMinutes = (since: number | null | undefined, now = Date.now()) =>
  since == null || since > now ? null : Math.max(0, Math.floor((now - since) / 60000))
export const queuedCount = (id: string, matches: Match[]) =>
  matches.filter((m) => m.state === 'waiting' && allPlayers(m).includes(id)).length
export const isBookingEnded = (court: SessionCourt, sessionEnd: number, now: number) =>
  now >= (court.openUntil ?? sessionEnd)
export const listNames = (names: string[]) =>
  names.length < 3 ? names.join(' and ') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`
export const courtNames = (m: Pick<Match, 'courtIds'>, courts: SessionCourt[]) =>
  m.courtIds.map((id) => courts.find((c) => c.id === id)?.label ?? 'Court').join(' + ')
export type MatchContext = {
  roster: SessionPlayer[]
  matches: Match[]
  courts: SessionCourt[]
  now?: number
}
export function completeLineup(m: MatchLineup) {
  const sizes = FORMAT_TEAM_SIZES[m.format]
  return (
    !!sizes &&
    m.teamA.length === sizes[0] &&
    m.teamB.length === sizes[1] &&
    new Set(allPlayers(m)).size === allPlayers(m).length
  )
}
export function matchStatus(m: MatchLineup, ctx: MatchContext): MatchStatus {
  if (!completeLineup(m)) return { kind: 'needs-attention', reason: 'Lineup is incomplete' }
  const names = (ids: string[]) =>
    listNames(
      ids.map((id) => {
        const p = ctx.roster.find((p) => p.id === id)
        return p ? shortName(p) : 'Player'
      }),
    )
  const absent = allPlayers(m).filter((id) => !ctx.roster.find((p) => p.id === id)?.present)
  if (absent.length)
    return {
      kind: 'needs-attention',
      reason: `${names(absent)} ${absent.length === 1 ? 'is' : 'are'} not present`,
    }
  // An On court match already holds its court(s): only its players' presence and busy state count.
  const placed = 'state' in m && (m as Match).state === 'on_court' ? (m as Match) : undefined
  const busy = allPlayers(m).filter((id) => activeMatchFor(id, ctx.matches, placed?.id))
  const game = busy[0] ? activeMatchFor(busy[0], ctx.matches, placed?.id) : undefined
  if (game)
    return {
      kind: 'blocked',
      reason: `${names(busy)} ${busy.length === 1 ? 'is' : 'are'} ${game.state === 'on_court' ? 'on' : 'playing on'} ${courtNames(game, ctx.courts)}`,
    }
  if (placed) return { kind: 'ready', reason: 'Ready to start' }
  if (freeCourts(ctx.courts, ctx.matches, ctx.now).length < courtsNeeded(m))
    return {
      kind: 'waiting-for-courts',
      reason: courtsNeeded(m) === 2 ? 'Needs two free courts' : 'Waiting for a free court',
    }
  return { kind: 'ready', reason: 'Ready to start' }
}
/**
 * The next eligible match for a free open court, with the skip explanation. Given the session,
 * `notEnoughFreePlayers` says why the court gets no match when too few players are free
 * (Queueing › Short on players: "Not enough free players.", which wins over the blocked reason and
 * the empty queue). Without the session it is always false.
 */
export function nextEligibleForCourt(
  courtId: string,
  ctx: MatchContext,
  session?: Pick<QueueSession, 'allowSingles' | 'allowDoubles'>,
) {
  if (!freeCourts(ctx.courts, ctx.matches, ctx.now).some((c) => c.id === courtId))
    return { match: null, skipped: null, notEnoughFreePlayers: false }
  const waiting = ctx.matches
      .filter((m) => m.state === 'waiting')
      .sort((a, b) => a.queuePosition - b.queuePosition),
    match = waiting.find((m) => matchStatus(m, ctx).kind === 'ready') ?? null,
    first = waiting[0]
  return {
    match,
    skipped:
      match && first && match.id !== first.id
        ? `Skipped #1: ${matchStatus(first, ctx).reason}`
        : null,
    notEnoughFreePlayers: !match && !!session && notEnoughFreePlayers(session, ctx),
  }
}
/** One placement Auto Queue makes: a waiting match onto one court, On court (never started). */
export type AutoPlacement = { matchId: string; courtId: string }
/**
 * Auto Queue (Queueing › Auto Queue and Manual Queue): each free open court, in court order (the
 * order of `ctx.courts`), gets the next eligible waiting match in queue order. Skips 5v5 (always
 * placed by hand, on two courts) and courts not open yet; a court whose booking ended still fills.
 * `exceptMatchId` never goes on (Send back refills with a different match); `onlyCourtIds` limits
 * the fill to courts that just opened or were added; `exceptCourtIds` leaves courts free (the court
 * a just-confirmed result freed while the next-match picker is open). Pure: the caller applies the placements, and
 * decides whether Auto Queue is on and the device online. Each placement counts for the next one,
 * so a player is never placed twice.
 */
export function autoFillPlacements(
  ctx: MatchContext,
  options: {
    exceptMatchId?: string
    onlyCourtIds?: readonly string[]
    exceptCourtIds?: readonly string[]
  } = {},
): AutoPlacement[] {
  const placements: AutoPlacement[] = []
  let matches = ctx.matches
  for (const court of freeCourts(ctx.courts, ctx.matches, ctx.now)) {
    if (options.onlyCourtIds && !options.onlyCourtIds.includes(court.id)) continue
    if (options.exceptCourtIds?.includes(court.id)) continue
    const now: MatchContext = { ...ctx, matches }
    const next = waitingMatches(matches).find(
      (m) =>
        m.id !== options.exceptMatchId && courtsNeeded(m) === 1 && canPlace(m, [court.id], now),
    )
    if (!next) continue
    placements.push({ matchId: next.id, courtId: court.id })
    matches = matches.map((m) =>
      m.id === next.id ? { ...m, state: 'on_court' as const, courtIds: [court.id] } : m,
    )
  }
  return placements
}
/**
 * The next-match picker after a result (Q-NEXT-MATCH): the first `limit` waiting matches, in Main
 * Queue order, that are ready for `courtId` by the same check Auto Queue uses (one court, and
 * `canPlace` on that court). No ranking of its own; empty when the court is not free.
 */
export const nextMatchCandidates = (courtId: string, ctx: MatchContext, limit = 5) =>
  waitingMatches(ctx.matches)
    .filter((m) => courtsNeeded(m) === 1 && canPlace(m, [courtId], ctx))
    .slice(0, Math.max(0, Math.min(limit, 5)))
    .map((match) => ({
      ...match,
      gamesByPlayer: Object.fromEntries(
        allPlayers(match).map((id) => [id, countedGames(id, ctx.matches)]),
      ),
    }))
/** Players a standard match needs: doubles 4, else singles 2 (doubles first when both are on). */
export const standardMatchSize = (session: Pick<QueueSession, 'allowSingles' | 'allowDoubles'>) =>
  session.allowDoubles ? 4 : session.allowSingles ? 2 : 0
/** The smallest standard match: singles 2 when singles is on, else doubles 4; 0 with neither. */
export const smallestStandardMatchSize = (
  session: Pick<QueueSession, 'allowSingles' | 'allowDoubles'>,
) => (session.allowSingles ? 2 : standardMatchSize(session))
/** Present players who are not busy (On court or Playing). */
export const freePresentCount = (ctx: Pick<MatchContext, 'roster' | 'matches'>) =>
  ctx.roster.filter((p) => p.present && !activeMatchFor(p.id, ctx.matches)).length
/**
 * A free open court with no match to put on says "Not enough free players." when fewer players
 * are free than the smallest standard match needs (Queueing › Short on players).
 */
export const notEnoughFreePlayers = (
  session: Pick<QueueSession, 'allowSingles' | 'allowDoubles'>,
  ctx: Pick<MatchContext, 'roster' | 'matches'>,
) => {
  const need = smallestStandardMatchSize(session)
  return need > 0 && freePresentCount(ctx) < need
}
/** What the ShortOnPlayersBanner words: courts the present players can run, and who sits out. */
export type ShortOnPlayers = {
  /** All present players, busy or not */
  present: number
  doublesCourts: number
  singlesCourts: number
  sitOut: number
  standardFormat: 'doubles' | 'singles'
}
/**
 * Queueing › Short on players: the banner above Courts when the present players who aren't busy
 * can't fill every free open court with the session's standard format. It counts all present
 * players against the open courts (doubles first, 4 a court; then singles, 2 a court). Null (no
 * banner) when the free players can fill every free open court, no court is free, nobody is
 * present, or neither standard format is on. Never changes queue order, pairing or the minimum.
 */
export function shortOnPlayers(
  session: Pick<QueueSession, 'allowSingles' | 'allowDoubles'>,
  ctx: MatchContext,
): ShortOnPlayers | null {
  const per = standardMatchSize(session),
    open = ctx.courts.filter((c) => !c.removedAt && courtOpen(c, ctx.now)).length,
    present = ctx.roster.filter((p) => p.present).length,
    freeOpen = freeCourts(ctx.courts, ctx.matches, ctx.now).length
  if (!per || !present || present >= open * per || !freeOpen) return null
  if (freePresentCount(ctx) >= freeOpen * per) return null
  const doublesCourts = session.allowDoubles ? Math.min(open, Math.floor(present / 4)) : 0
  const singlesCourts = session.allowSingles
    ? Math.min(open - doublesCourts, Math.floor((present - 4 * doublesCourts) / 2))
    : 0
  return {
    present,
    doublesCourts,
    singlesCourts,
    sitOut: present - 4 * doublesCourts - 2 * singlesCourts,
    standardFormat: session.allowDoubles ? 'doubles' : 'singles',
  }
}
/** Who gets this game after a substitution: Nobody (default), the incoming or the outgoing player. */
export const SUBSTITUTION_CREDITS: readonly SubstitutionCredit[] = ['none', 'incoming', 'outgoing']
/**
 * The team slot of each substitution, by index: a substitution whose outgoing player came in
 * through an earlier one in the same team shares that one's slot (the slot is the lineup position).
 */
export function substitutionSlots(subs: Match['substitutions']): number[] {
  const slotOf = new Map<string, number>()
  return subs.map((s, i) => {
    const key = `${s.team}:${s.outId}`,
      slot = slotOf.get(key) ?? i
    slotOf.delete(key)
    slotOf.set(`${s.team}:${s.inId}`, slot)
    return slot
  })
}
/**
 * Who gets the game after in-game substitutions (QM choice), with their team. One person per team
 * slot at most: a later substitution in the same slot that names a person replaces the earlier
 * choice; Nobody leaves it alone. Session counting only; long-term performance never reads this.
 */
export function creditedPlayers(m: Pick<Match, 'substitutions'>): Map<string, 'A' | 'B'> {
  const slots = substitutionSlots(m.substitutions),
    bySlot = new Map<number, { id: string; team: 'A' | 'B' }>()
  m.substitutions.forEach((s, i) => {
    const slot = slots[i] as number
    if (s.creditTo === 'incoming') bySlot.set(slot, { id: s.inId, team: s.team })
    else if (s.creditTo === 'outgoing') bySlot.set(slot, { id: s.outId, team: s.team })
  })
  return new Map([...bySlot.values()].map((c) => [c.id, c.team]))
}
/** Both sides of an in-game substitution: neither is a full participant of the match. */
export const isPartial = (m: Pick<Match, 'substitutions'>, id: string) =>
  m.substitutions.some((s) => s.outId === id || s.inId === id)
/**
 * The side a counted player played on: their team as the match finished, or, for a credited
 * substitute who went off, the team of their slot. Null when the match does not count for them.
 */
export function countedTeam(m: Match, id: string): 'A' | 'B' | null {
  if (m.state !== 'completed') return null
  if (!isPartial(m, id)) return m.teamA.includes(id) ? 'A' : m.teamB.includes(id) ? 'B' : null
  return creditedPlayers(m).get(id) ?? null
}
/**
 * A counted game for the session (game count, minimum, win/loss, standings, awards): a completed
 * match the player played in full, or one the operator gave them after a substitution. Invalid
 * matches count for no one.
 */
export function countsFor(m: Match, id: string) {
  return countedTeam(m, id) !== null
}
export function countedGames(id: string, matches: Match[]) {
  return matches.filter((m) => countsFor(m, id)).length
}
/** A roster row's Set games played adjustment (#717); 0 when none. */
export type GamesAdjusted = Pick<SessionPlayer, 'id'> & Pick<SessionPlayer, 'gamesAdjustment'>
export const gamesAdjustmentOf = (player: Pick<SessionPlayer, 'gamesAdjustment'> | undefined) =>
  player?.gamesAdjustment ?? 0
/**
 * Games played as shown everywhere (#717): the counted games (`countedGames`) plus the Queue
 * Master's Set games played adjustment, floored at 0. Auto Queue, Catch Up, fewest-games sorting,
 * the Players tab cards and the live standings read this; facts and results never do.
 */
export function gamesPlayed(player: GamesAdjusted, matches: Match[]) {
  return Math.max(0, countedGames(player.id, matches) + gamesAdjustmentOf(player))
}
/** `gamesPlayed` by roster id, for callers holding a MatchContext; an unknown id has no adjustment. */
export function gamesPlayedFor(id: string, ctx: Pick<MatchContext, 'roster' | 'matches'>) {
  return gamesPlayed(
    { id, gamesAdjustment: gamesAdjustmentOf(ctx.roster.find((p) => p.id === id)) },
    ctx.matches,
  )
}
export function waitMinutes(
  player: SessionPlayer,
  matches: Match[],
  startedAt: number | null,
  now = Date.now(),
) {
  const ends = matches
    .filter(
      (m) =>
        (m.state === 'completed' || m.state === 'invalid') &&
        (allPlayers(m).includes(player.id) || m.substitutions.some((s) => s.outId === player.id)),
    )
    .map((m) => m.endedAt ?? 0)
  return Math.max(
    0,
    Math.floor((now - Math.max(player.presentChangedAt ?? startedAt ?? now, ...ends)) / 60000),
  )
}
export function computeStandings(roster: SessionPlayer[], matches: Match[]) {
  const rows = roster
    .map((p) => {
      const games = matches.filter((m) => countsFor(m, p.id)),
        wins = games.filter(
          (m) => m.decision?.winningTeam && m.decision.winningTeam === countedTeam(m, p.id),
        ).length,
        losses = games.filter(
          (m) => m.decision?.winningTeam && m.decision.winningTeam !== countedTeam(m, p.id),
        ).length
      // Games is the shown count (#717 adjustment); wins, losses and head-to-head stay as recorded.
      return { playerId: p.id, name: p.nameSnapshot, wins, losses, games: gamesPlayed(p, matches) }
    })
    .filter((r) => r.games > 0)
  const headToHead = (a: string, b: string) =>
    matches.reduce((n, m) => {
      const teamA = countedTeam(m, a),
        teamB = countedTeam(m, b)
      if (!teamA || !teamB || !m.decision?.winningTeam || teamA === teamB) return n
      return n + (m.decision.winningTeam === teamA ? -1 : 1)
    }, 0)
  return rows.sort(
    (a, b) =>
      b.wins - a.wins ||
      a.losses - b.losses ||
      headToHead(a.playerId, b.playerId) ||
      a.name.localeCompare(b.name),
  )
}
/** Put on court: a ready waiting match on the right number of distinct, free, open courts. */
export function canPlace(m: Match, courtIds: string[], ctx: MatchContext) {
  return (
    m.state === 'waiting' &&
    matchStatus(m, ctx).kind === 'ready' &&
    courtIds.length === courtsNeeded(m) &&
    new Set(courtIds).size === courtIds.length &&
    courtIds.every((id) => freeCourts(ctx.courts, ctx.matches, ctx.now).some((c) => c.id === id))
  )
}
/**
 * Start match. From On court: no court choice (an empty `courtIds`, or exactly the held courts);
 * rechecks lineup, presence and busy players, and that each held court is still open and held by
 * no other match. From waiting: the older one-step start (place and start at once), kept for
 * callers not yet moved to Put on court; same checks as `canPlace`.
 */
export function canStart(m: Match, courtIds: string[], ctx: MatchContext) {
  if (m.state === 'waiting') return canPlace(m, courtIds, ctx)
  if (m.state !== 'on_court') return false
  const held = new Set(m.courtIds)
  if (courtIds.length && (courtIds.length !== held.size || !courtIds.every((id) => held.has(id))))
    return false
  return (
    matchStatus(m, ctx).kind === 'ready' &&
    held.size === m.courtIds.length &&
    m.courtIds.length === courtsNeeded(m) &&
    m.courtIds.every((id) => {
      const court = ctx.courts.find((c) => c.id === id)
      return (
        !!court &&
        !court.removedAt &&
        courtOpen(court, ctx.now) &&
        !ctx.matches.some((o) => o.id !== m.id && holdsCourt(o) && o.courtIds.includes(id))
      )
    })
  )
}
/** Send back to queue (Q-ON-COURT): any On court match; it goes to the top of the queue. */
export const canSendBack = (m: Pick<Match, 'state'>) => m.state === 'on_court'
/**
 * Move to another court (Q-ON-COURT): an On court match onto the right number of distinct, free,
 * open courts (two for 5v5). Its own courts are held by itself, so they never count as free.
 */
export function canMoveCourt(m: Match, courtIds: string[], ctx: MatchContext) {
  const free = freeCourts(ctx.courts, ctx.matches, ctx.now)
  return (
    m.state === 'on_court' &&
    courtIds.length === courtsNeeded(m) &&
    new Set(courtIds).size === courtIds.length &&
    courtIds.every((id) => free.some((c) => c.id === id))
  )
}
/**
 * Replace player (Q-ON-COURT): a plain lineup change on an On court match, never a substitution.
 * The incoming player is present, not in this match and not busy elsewhere (On court or Playing).
 */
/**
 * Replace player: On court (a lineup change) or Playing (fixes a mistake, 2026-11-13: the
 * replacement is recorded as having played the whole game; no substitution, no credit choice).
 */
export function canReplacePlayer(m: Match, outId: string, inId: string, ctx: MatchContext) {
  return (
    (m.state === 'on_court' || m.state === 'active') &&
    allPlayers(m).includes(outId) &&
    substitutionCandidates(m, ctx.roster, ctx.matches).some((p) => p.id === inId)
  )
}
/** The lineup after Replace player: the incoming player takes the outgoing player's slot. */
export function replacedLineup(m: MatchLineup, outId: string, inId: string): MatchLineup {
  const swap = (ids: string[]) => ids.map((id) => (id === outId ? inId : id))
  return { format: m.format, teamA: swap(m.teamA), teamB: swap(m.teamB) }
}
/**
 * Swap with the queue (Q-ON-COURT, court card ⋯ menu): the first waiting match in queue order
 * that needs the same number of courts and could be put on this match's court(s) once this
 * match's players count as free. `position` is its 1-based place in the queue ("Swap with #P"), which this
 * match takes. Null when the match is not On court or no other waiting match is ready.
 */
export type SwapTarget = { match: Match; position: number }
export function swapTarget(m: Match, ctx: MatchContext): SwapTarget | null {
  if (m.state !== 'on_court') return null
  // This match off the court: its court(s) free up and its players are no longer busy.
  const freed: MatchContext = {
    ...ctx,
    matches: ctx.matches.map((x) =>
      x.id === m.id ? { ...x, state: 'waiting' as const, courtIds: [] } : x,
    ),
  }
  const waiting = waitingMatches(ctx.matches)
  const index = waiting.findIndex(
    (x) => x.id !== m.id && courtsNeeded(x) === courtsNeeded(m) && canPlace(x, m.courtIds, freed),
  )
  const match = waiting[index]
  return match ? { match, position: index + 1 } : null
}
export type ResultInput = {
  winner?: 'A' | 'B' | null
  scoreA?: number | null
  scoreB?: number | null
}
export function validateResult(
  input: ResultInput,
): { winner: 'A' | 'B'; error: null } | { winner: null; error: string } {
  const { winner, scoreA, scoreB } = input
  if (scoreA != null || scoreB != null) {
    if (
      scoreA == null ||
      scoreB == null ||
      !Number.isInteger(scoreA) ||
      !Number.isInteger(scoreB) ||
      scoreA < 0 ||
      scoreB < 0
    )
      return { winner: null, error: 'Enter both scores as whole numbers, or clear them.' }
    if (scoreA === scoreB)
      return {
        winner: null,
        error: 'A tie can’t decide a winner. Correct the score, or clear it and pick a winner.',
      }
    const byScore = scoreA > scoreB ? 'A' : 'B'
    if (winner && winner !== byScore)
      return {
        winner: null,
        error: `The score says Team ${byScore} won, but Team ${winner} is picked. Fix one of them.`,
      }
    return { winner: byScore, error: null }
  }
  return winner === 'A' || winner === 'B'
    ? { winner, error: null }
    : { winner: null, error: 'Pick a winner or enter the final score.' }
}
export function substitutionCandidates(m: Match, roster: SessionPlayer[], matches: Match[]) {
  return roster.filter(
    (p) =>
      p.sessionId === m.sessionId &&
      p.present &&
      !allPlayers(m).includes(p.id) &&
      !activeMatchFor(p.id, matches),
  )
}

export const FORMAT_LABEL = FORMAT_LABELS
export const isFunFormat = (format: MatchFormat) => format.startsWith('fun_')
export const waitingMatches = (matches: Match[]) =>
  matches.filter((m) => m.state === 'waiting').sort((a, b) => a.queuePosition - b.queuePosition)
/** Playing matches only (what blocks Session done). On court matches are listed separately. */
export const activeMatches = (matches: Match[]) => matches.filter((m) => m.state === 'active')
/** Placed, not started (court card: Getting ready). */
export const onCourtMatches = (matches: Match[]) => matches.filter((m) => m.state === 'on_court')
/** Every match holding a court: On court and Playing. */
export const courtMatches = (matches: Match[]) => matches.filter(holdsCourt)
