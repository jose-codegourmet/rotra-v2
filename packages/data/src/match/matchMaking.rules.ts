import { PLAYING_LEVELS } from '../player/player.types'
import type { QueueSession } from '../queue-session/queueSession.types'
import type { SessionPlayer } from '../session-roster/sessionRoster.types'
import { allPlayers, countedTeam } from './match.rules'
import type { Match, MatchLineup } from './match.types'

/**
 * Match making factors for Generate matches (D-2026-11-25-01): three checks in priority order, a
 * ladder, not a points score. 1. Whose turn (fair turns win over close games), 2. Fresh faces,
 * 3. Even game. The mockup's streakOf / nightGames / restAfter / tonightLevel / freshPick / cmpKeys.
 */

const startOf = (m: Pick<Match, 'startedAt' | 'placedAt'>) => m.startedAt ?? m.placedAt ?? 0

/** A player's games tonight in start order: completed, On court and Playing (invalid never counts). */
export function nightGames(id: string, matches: readonly Match[]) {
  return matches
    .filter(
      (m) =>
        (m.state === 'completed' || m.state === 'on_court' || m.state === 'active') &&
        allPlayers(m).includes(id),
    )
    .sort((a, b) => startOf(a) - startOf(b))
}

/**
 * Games in a row: the player's latest games with no started match in between that they sat out. A
 * match that started after one of their games ended and before the next began, without them,
 * resets the streak. On court and Playing games count (they have not ended).
 */
export function streakOf(id: string, matches: readonly Match[]) {
  const games = nightGames(id, matches)
  let n = 0,
    to = Number.POSITIVE_INFINITY
  for (let i = games.length - 1; i >= 0; i--) {
    const g = games[i] as Match
    const from = g.state === 'completed' ? (g.endedAt ?? startOf(g)) : Number.POSITIVE_INFINITY
    if (
      matches.some(
        (m) =>
          m.startedAt != null &&
          m.startedAt > from &&
          m.startedAt < to &&
          !allPlayers(m).includes(id),
      )
    )
      break
    n += 1
    to = startOf(g)
  }
  return n
}

/**
 * Exhaustion (Whose turn): 2 games in a row, 3 in Hard mode; a player with a handicap tonight
 * (D-2026-11-25-03) one fewer (1, Hard 2).
 */
export const restAfter = (
  session: Pick<QueueSession, 'sessionMode'>,
  player: Pick<SessionPlayer, 'handicapSpots'> | undefined,
) => (session.sessionMode === 'hard' ? 3 : 2) - (player?.handicapSpots?.length ? 1 : 0)

/**
 * Matches rested: matches that started since the player's last game ended (or since they became
 * present), without them.
 */
export function matchesRested(
  player: Pick<SessionPlayer, 'id' | 'presentChangedAt'>,
  matches: readonly Match[],
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
  const since = Math.max(player.presentChangedAt ?? startedAt ?? now, ...ends)
  return matches.filter(
    (m) => m.startedAt != null && m.startedAt > since && !allPlayers(m).includes(player.id),
  ).length
}

/**
 * Even game: the level adjusted by tonight's results only, level + 0.25 × (wins − losses), capped
 * at ±1 level (no level counts as 4). No long-term win rate (rank math is still open).
 */
export function tonightLevel(
  player: Pick<SessionPlayer, 'id' | 'level'>,
  matches: readonly Match[],
) {
  let wins = 0,
    losses = 0
  for (const m of matches) {
    const winner = m.decision?.kind === 'completed' ? m.decision.winningTeam : null
    if (!winner) continue
    const side = countedTeam(m as Match, player.id)
    if (!side) continue
    if (side === winner) wins += 1
    else losses += 1
  }
  const base = player.level ? PLAYING_LEVELS.indexOf(player.level) : 4
  return base + Math.max(-1, Math.min(1, 0.25 * (wins - losses)))
}

/** Compares two key lists element by element (lower first). */
export function compareKeys(a: readonly number[], b: readonly number[]) {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return (a[i] ?? 0) - (b[i] ?? 0)
  return 0
}

/**
 * Fresh faces inside Whose turn: players more due than the last one Whose turn would pick must
 * play; among the players tied with that last one, take the first group (in Whose turn order) with
 * nobody from each other's last 2 games. If none exists, keep the Whose turn group (a strong
 * avoid, broken only when no match is possible otherwise). `must` (bagging partners) go first.
 * `avoided` is the Whose turn group that was replaced, or null.
 */
export function freshPick<T>(
  sorted: readonly T[],
  size: number,
  must: readonly T[],
  key: (p: T) => readonly number[],
  clash: (a: T, b: T) => boolean,
): { group: T[]; avoided: T[] | null } {
  const rest = sorted.filter((p) => !must.includes(p)),
    need = size - must.length
  const strict = [...must, ...rest.slice(0, need)]
  const ok = (g: readonly T[]) => !g.some((x, i) => g.slice(i + 1).some((y) => clash(x, y)))
  if (need <= 0 || ok(strict)) return { group: strict, avoided: null }
  const cut = key(rest[need - 1] as T)
  const base = [...must, ...rest.filter((p) => compareKeys(key(p), cut) < 0)],
    tied = rest.filter((p) => compareKeys(key(p), cut) === 0),
    k = size - base.length
  let found: T[] | null = null
  const walk = (from: number, chosen: T[]) => {
    if (found) return
    if (chosen.length === k) {
      found = [...base, ...chosen]
      return
    }
    for (let i = from; i <= tied.length - (k - chosen.length) && !found; i++) {
      const next = [...chosen, tied[i] as T]
      if (ok([...base, ...next])) walk(i + 1, next)
    }
  }
  if (ok(base)) walk(0, [])
  return found ? { group: found, avoided: strict } : { group: strict, avoided: null }
}

/** The player's last 2 games: tonight's (in start order) then this batch's drafts, latest last. */
export function lastTwoGames(
  id: string,
  night: readonly MatchLineup[],
  drafts: readonly MatchLineup[],
) {
  return [...night, ...drafts].filter((m) => allPlayers(m).includes(id)).slice(-2)
}

/** Partners in `m`: on the same team. */
export const partnersIn = (m: MatchLineup, a: string, b: string) =>
  (m.teamA.includes(a) && m.teamA.includes(b)) || (m.teamB.includes(a) && m.teamB.includes(b))

/** The reason line's Whose turn part (mockup log copy). */
export function whoseTurnText(input: {
  tired: boolean
  rested: number
  mode: 'available' | 'ahead' | 'wait' | 'fewest' | 'catchup'
  catchUpTarget?: number
}) {
  if (input.tired) return 'Not enough rested players'
  if (input.rested > 0) return `Rested ${input.rested} match${input.rested === 1 ? '' : 'es'}`
  if (input.mode === 'catchup') {
    const t = input.catchUpTarget ?? 0
    return `Below ${t} game${t === 1 ? '' : 's'}`
  }
  return input.mode === 'wait' ? 'Longest wait' : 'Fewest games'
}
