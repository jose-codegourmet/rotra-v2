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
export const activeMatchFor = (id: string, matches: Match[]) =>
  matches.find((m) => m.state === 'active' && allPlayers(m).includes(id))
export const freeCourts = (courts: SessionCourt[], matches: Match[]) =>
  courts.filter(
    (c) => !c.removedAt && !matches.some((m) => m.state === 'active' && m.courtIds.includes(c.id)),
  )
export const queuedCount = (id: string, matches: Match[]) =>
  matches.filter((m) => m.state === 'waiting' && allPlayers(m).includes(id)).length
export const isBookingEnded = (court: SessionCourt, sessionEnd: number, now: number) =>
  now >= (court.openUntil ?? sessionEnd)
export const listNames = (names: string[]) =>
  names.length < 3 ? names.join(' and ') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`
export const courtNames = (m: Pick<Match, 'courtIds'>, courts: SessionCourt[]) =>
  m.courtIds.map((id) => courts.find((c) => c.id === id)?.label ?? 'Court').join(' + ')
export type MatchContext = { roster: SessionPlayer[]; matches: Match[]; courts: SessionCourt[] }
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
  const playing = allPlayers(m).filter((id) => activeMatchFor(id, ctx.matches))
  const game = playing[0] ? activeMatchFor(playing[0], ctx.matches) : undefined
  if (game)
    return {
      kind: 'blocked',
      reason: `${names(playing)} ${playing.length === 1 ? 'is' : 'are'} playing on ${courtNames(game, ctx.courts)}`,
    }
  if (freeCourts(ctx.courts, ctx.matches).length < courtsNeeded(m))
    return {
      kind: 'waiting-for-courts',
      reason: courtsNeeded(m) === 2 ? 'Needs two free courts' : 'Waiting for a free court',
    }
  return { kind: 'ready', reason: 'Ready to start' }
}
export function nextEligibleForCourt(courtId: string, ctx: MatchContext) {
  if (!freeCourts(ctx.courts, ctx.matches).some((c) => c.id === courtId))
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
export function canStart(m: Match, courtIds: string[], ctx: MatchContext) {
  return (
    m.state === 'waiting' &&
    matchStatus(m, ctx).kind === 'ready' &&
    courtIds.length === courtsNeeded(m) &&
    new Set(courtIds).size === courtIds.length &&
    courtIds.every((id) => freeCourts(ctx.courts, ctx.matches).some((c) => c.id === id))
  )
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
export const activeMatches = (matches: Match[]) => matches.filter((m) => m.state === 'active')
