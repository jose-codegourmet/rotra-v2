import type { SessionCourt } from '../queue-session/queueSession.types'
import { shortName } from '../session-roster/sessionRoster.rules'
import type { SessionPlayer } from '../session-roster/sessionRoster.types'
import type { Match, MatchFormat, MatchLineup, MatchStatus } from './match.types'

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
export function nextEligibleForCourt(courtId: string, ctx: MatchContext) {
  if (!freeCourts(ctx.courts, ctx.matches, ctx.now).some((c) => c.id === courtId))
    return { match: null, skipped: null }
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
  }
}
export function countsFor(m: Match, id: string) {
  return (
    m.state === 'completed' &&
    allPlayers(m).includes(id) &&
    !m.substitutions.some((s) => s.outId === id || s.inId === id)
  )
}
export function countedGames(id: string, matches: Match[]) {
  return matches.filter((m) => countsFor(m, id)).length
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
          (m) =>
            m.decision?.winningTeam && (m.decision.winningTeam === 'A') === m.teamA.includes(p.id),
        ).length,
        losses = games.filter(
          (m) =>
            m.decision?.winningTeam && (m.decision.winningTeam === 'A') !== m.teamA.includes(p.id),
        ).length
      return { playerId: p.id, name: p.nameSnapshot, wins, losses, games: games.length }
    })
    .filter((r) => r.games > 0)
  const headToHead = (a: string, b: string) =>
    matches.reduce((n, m) => {
      if (
        !countsFor(m, a) ||
        !countsFor(m, b) ||
        !m.decision?.winningTeam ||
        m.teamA.includes(a) === m.teamA.includes(b)
      )
        return n
      return n + ((m.decision.winningTeam === 'A') === m.teamA.includes(a) ? -1 : 1)
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
export function canReplacePlayer(m: Match, outId: string, inId: string, ctx: MatchContext) {
  return (
    m.state === 'on_court' &&
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
    (x) =>
      x.id !== m.id && courtsNeeded(x) === courtsNeeded(m) && canPlace(x, m.courtIds, freed),
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
