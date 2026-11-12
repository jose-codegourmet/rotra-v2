import type { Engine } from './engine.ts'

export type PlayerOutcome = {
  id: string
  name: string
  minutesPresent: number
  wholeSession: boolean
  target: number
  actual: number
  tally: number
  /** Games played that count for nobody: invalid matches, and substitutions credited elsewhere. */
  uncounted: number
}

export type Outcome = {
  minimum: number
  players: PlayerOutcome[]
  failures: string[]
}

/**
 * The minimum-games OUTCOME of one run, from the app's own reads:
 * - counted games: the result snapshot's standings after Session done (the app's counting rule),
 *   cross-checked against this run's own tally of what it did;
 * - the minimum: the session's own `minimumGames` (never computed here).
 *
 * 1. PASS RULE (owner decision): everyone reaches floor(minimum × minutesPresent ÷ sessionMinutes).
 * 2. Fairness: among players Present the whole session, max − min ≤ 2.
 * 3. The done-review's below-minimum list is exactly the players with counted games < minimum.
 * 4. Invalid matches give nobody games; substitution credit follows the choice; no double credit
 *    (the tally counts exactly that, so any difference is a mismatch).
 */
export function evaluate(engine: Engine): Outcome {
  const failures: string[] = []
  const minimum = engine.session.session.minimumGames
  const app = new Map((engine.standings ?? []).map((r) => [r.sessionPlayerId, r.games]))
  const tally = engine.tally()
  const players = engine.roster.map((p): PlayerOutcome => {
    const minutesPresent = engine.minutesPresent(p.id)
    return {
      id: p.id,
      name: engine.name(p.id),
      minutesPresent,
      wholeSession: engine.presentWholeSession(p.id),
      target: Math.floor((minimum * minutesPresent) / engine.sessionMinutes),
      actual: app.get(p.id) ?? 0,
      tally: tally.get(p.id) ?? 0,
      uncounted: uncounted(engine, p.id),
    }
  })

  const mismatched = players.filter((p) => p.actual !== p.tally)
  if (mismatched.length)
    failures.push(
      `counted games differ from the run's tally: ${mismatched
        .map((p) => `${p.name} app=${p.actual} tally=${p.tally}`)
        .join(', ')}`,
    )
  const totalApp = [...app.values()].reduce((a, b) => a + b, 0)
  const totalTally = [...tally.values()].reduce((a, b) => a + b, 0)
  if (totalApp !== totalTally)
    failures.push(`total counted games: app ${totalApp}, tally ${totalTally}`)

  const short = players.filter((p) => p.actual < p.target)
  if (short.length)
    failures.push(
      `PASS RULE: ${short.length} player(s) below floor(minimum × minutesPresent ÷ ${engine.sessionMinutes}): ${short
        .map(
          (p) =>
            `${p.name} present=${p.minutesPresent}m target=${p.target} actual=${p.actual} uncounted=${p.uncounted}`,
        )
        .join('; ')}`,
    )

  const whole = players.filter((p) => p.wholeSession)
  if (whole.length > 1) {
    const games = whole.map((p) => p.actual)
    const spread = Math.max(...games) - Math.min(...games)
    if (spread > 2)
      failures.push(
        `fairness: games of players present the whole session spread ${spread} (> 2): ${whole
          .map((p) => `${p.name}=${p.actual}`)
          .join(' ')}`,
      )
  }

  const listed = new Set((engine.review?.belowMinimum ?? []).map((p) => p.sessionPlayerId))
  const below = new Set(players.filter((p) => p.actual < minimum).map((p) => p.id))
  const extra = [...listed].filter((id) => !below.has(id))
  const missing = [...below].filter((id) => !listed.has(id))
  if (extra.length || missing.length)
    failures.push(
      `done-review below-minimum list differs: listed but not below [${extra.map((id) => engine.name(id))}], ` +
        `below but not listed [${missing.map((id) => engine.name(id))}]`,
    )
  for (const row of engine.review?.belowMinimum ?? []) {
    const p = players.find((x) => x.id === row.sessionPlayerId)
    if (p && p.actual !== row.games)
      failures.push(`done-review says ${p.name} has ${row.games} games, standings say ${p.actual}`)
  }

  for (const d of engine.decided.filter((x) => x.kind === 'invalid')) {
    const subs = engine.subs.filter((s) => s.matchId === d.matchId)
    if (subs.some((s) => s.credit !== 'none'))
      engine.log(`#${d.matchNo} invalid with a credited substitution: credit must not count`)
  }
  return { minimum, players, failures }
}

/** The failure report: run identity, every short player, then the compact match log. */
export function report(engine: Engine, outcome: Outcome, failures: string[]) {
  const { cfg } = engine
  const head = [
    `seed=${cfg.seed} scenario=${cfg.id} ${cfg.scenario} shape=${cfg.shape.name} strategy=${cfg.strategy}`,
    `minimum=${outcome.minimum} sessionMinutes=${engine.sessionMinutes} players=${engine.roster.length}`,
    ...failures.map((f) => `FAIL ${f}`),
    'player  present  target  actual  tally  uncounted  whole',
    ...outcome.players
      .filter((p) => p.actual < p.target || p.actual !== p.tally || failures.length)
      .map(
        (p) =>
          `${p.name.padEnd(6)}  ${String(p.minutesPresent).padStart(6)}m  ${String(p.target).padStart(6)}  ${String(p.actual).padStart(6)}  ${String(p.tally).padStart(5)}  ${String(p.uncounted).padStart(9)}  ${p.wholeSession ? 'yes' : 'no'}`,
      ),
  ]
  return [...head, '--- match log ---', ...engine.lines].join('\n')
}

/** Matches this player took part in that give them no game (invalid, or a substitution not credited to them). */
function uncounted(engine: Engine, id: string) {
  let n = 0
  for (const d of engine.decided) {
    const subs = engine.subs.filter((s) => s.matchId === d.matchId)
    const inLineup = d.lineup.includes(id) || subs.some((s) => s.outId === id)
    if (!inLineup) continue
    if (d.kind === 'invalid') n++
    else if (subs.some((s) => s.inId === id || s.outId === id)) {
      const credited = subs.some(
        (s) =>
          (s.credit === 'incoming' && s.inId === id) || (s.credit === 'outgoing' && s.outId === id),
      )
      if (!credited) n++
    }
  }
  return n
}
