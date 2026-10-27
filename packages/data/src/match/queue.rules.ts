import { PLAYING_LEVELS } from '../player/player.types'
import type { QueueSession } from '../queue-session/queueSession.types'
import { shortName } from '../session-roster/sessionRoster.rules'
import type { SessionPlayer } from '../session-roster/sessionRoster.types'
import {
  activeMatchFor,
  allPlayers,
  countedGames,
  type MatchContext,
  matchStatus,
  queuedCount,
  waitMinutes,
} from './match.rules'
import type { Match, MatchFormat, MatchLineup } from './match.types'
export function formatForSelection(
  count: number,
  session: Pick<QueueSession, 'allowSingles' | 'allowDoubles'>,
): { format: MatchFormat; reason: null } | { format: null; reason: string } {
  const format: MatchFormat | undefined = (
    {
      2: 'singles',
      3: 'fun_1v2',
      4: 'doubles',
      6: 'fun_3v3',
      8: 'fun_4v4',
      10: 'fun_5v5',
    } as Record<number, MatchFormat>
  )[count]
  if (!format) return { format: null, reason: 'pick 2, 3, 4, 6, 8 or 10 players' }
  if (format === 'singles' && !session.allowSingles)
    return { format: null, reason: 'singles is off for this session' }
  if (format === 'doubles' && !session.allowDoubles)
    return { format: null, reason: 'doubles is off for this session' }
  return { format, reason: null }
}
const level = (p: SessionPlayer) => (p.level ? PLAYING_LEVELS.indexOf(p.level) : 4)
function partitions(players: SessionPlayer[]) {
  return [
    [
      [0, 1],
      [2, 3],
    ],
    [
      [0, 2],
      [1, 3],
    ],
    [
      [0, 3],
      [1, 2],
    ],
  ]
    .map(([a, b]) => {
      const teamA = (a ?? []).map((i) => players[i]).filter((p): p is SessionPlayer => !!p),
        teamB = (b ?? []).map((i) => players[i]).filter((p): p is SessionPlayer => !!p)
      return {
        teamA: teamA.map((p) => p.id),
        teamB: teamB.map((p) => p.id),
        diff: Math.abs(
          teamA.reduce((n, p) => n + level(p), 0) - teamB.reduce((n, p) => n + level(p), 0),
        ),
      }
    })
    .sort((a, b) => a.diff - b.diff)
}
export function balanceTeams(players: SessionPlayer[], format: MatchFormat): MatchLineup {
  if (format === 'doubles') {
    const option = partitions(players)[0]
    return { format, teamA: option?.teamA ?? [], teamB: option?.teamB ?? [] }
  }
  const sorted = [...players].sort((a, b) => level(b) - level(a)).map((p) => p.id)
  if (format === 'singles' || format === 'fun_1v2')
    return { format, teamA: sorted.slice(0, 1), teamB: sorted.slice(1) }
  return {
    format,
    teamA: sorted.filter((_, i) => i % 4 === 0 || i % 4 === 3),
    teamB: sorted.filter((_, i) => i % 4 === 1 || i % 4 === 2),
  }
}
/** Reference heuristic from the prototype; the final strength model, mode weights and default run size are open decisions (business open-decisions › Queue generation). */
export function splitTeams(
  session: Pick<QueueSession, 'sessionMode'>,
  players: SessionPlayer[],
  format: 'singles' | 'doubles',
  rng: () => number,
): MatchLineup {
  if (format === 'singles')
    return {
      format,
      teamA: players.slice(0, 1).map((p) => p.id),
      teamB: players.slice(1, 2).map((p) => p.id),
    }
  const options = partitions(players),
    easy =
      session.sessionMode === 'chill'
        ? rng() < 0.3
        : session.sessionMode === 'fair'
          ? rng() < 0.1
          : false,
    option = easy ? options.at(-1) : options[0]
  return { format, teamA: option?.teamA ?? [], teamB: option?.teamB ?? [] }
}
/** Reference heuristic from the prototype; the final strength model, mode weights and default run size are open decisions (business open-decisions › Queue generation). */
export function generateMatches(
  session: QueueSession,
  roster: SessionPlayer[],
  matches: Match[],
  n: number,
  rng: () => number,
): { matches: MatchLineup[]; error: null } | { matches: never[]; error: string } {
  const present = roster.filter((p) => p.sessionId === session.id && p.present),
    games = matches.filter((m) => m.sessionId === session.id)
  if (!session.allowSingles && !session.allowDoubles)
    return {
      matches: [],
      error:
        'Singles and doubles are both off for this session, so there is nothing to generate. Add a fun game manually instead.',
    }
  const load = new Map(
      present.map((p) => [
        p.id,
        countedGames(p.id, games) +
          (session.sessionMode === 'hard' ? 0 : 0.9 * queuedCount(p.id, games)) +
          rng() * 0.4,
      ]),
    ),
    out: MatchLineup[] = []
  for (let i = 0; i < n; i++) {
    const format =
        session.allowSingles && session.allowDoubles
          ? present.length >= 4 && i % 3 !== 2
            ? 'doubles'
            : 'singles'
          : session.allowDoubles
            ? 'doubles'
            : 'singles',
      size = format === 'doubles' ? 4 : 2
    if (present.length < size)
      return {
        matches: [],
        error: `Only ${present.length} player${present.length === 1 ? ' is' : 's are'} present. ${format === 'doubles' ? 'Doubles' : 'Singles'} needs ${size}. Mark arrivals present in Players.`,
      }
    const pick = [...present]
      .sort((a, b) => (load.get(a.id) ?? 0) - (load.get(b.id) ?? 0))
      .slice(0, size)
    out.push(splitTeams(session, pick, format, rng))
    for (const p of pick) load.set(p.id, (load.get(p.id) ?? 0) + 1)
  }
  return { matches: out, error: null }
}
export function suggestionReason(
  lineup: MatchLineup,
  session: QueueSession,
  roster: SessionPlayer[],
  matches: Match[],
) {
  const selected = roster.filter((p) => allPlayers(lineup).includes(p.id)),
    below = selected.filter((p) => countedGames(p.id, matches) < session.minimumGames)
  return below.length
    ? `${below
        .map((p) => `${shortName(p)} (${countedGames(p.id, matches)}/${session.minimumGames})`)
        .join(', ')} are below the minimum.`
    : 'Everyone has met the minimum. These players have the fewest games.'
}
export function regenerateScope(matches: Match[], ctx: MatchContext) {
  const waiting = matches.filter((m) => m.state === 'waiting')
  return {
    autoRebuilt: waiting.filter((m) => !m.manualProtected).length,
    healthyManualKept: waiting.filter(
      (m) => m.manualProtected && matchStatus(m, ctx).kind !== 'needs-attention',
    ).length,
    attentionManualRebuilt: waiting.filter(
      (m) => m.manualProtected && matchStatus(m, ctx).kind === 'needs-attention',
    ).length,
    gamesInPlay: matches.filter((m) => m.state === 'active').length,
  }
}
export function pickerOrder(
  roster: SessionPlayer[],
  matches: Match[],
  startedAt: number | null,
  now = Date.now(),
) {
  return [...roster].sort(
    (a, b) =>
      Number(!!activeMatchFor(a.id, matches)) - Number(!!activeMatchFor(b.id, matches)) ||
      Number(b.present) - Number(a.present) ||
      countedGames(a.id, matches) - countedGames(b.id, matches) ||
      waitMinutes(b, matches, startedAt, now) - waitMinutes(a, matches, startedAt, now),
  )
}
