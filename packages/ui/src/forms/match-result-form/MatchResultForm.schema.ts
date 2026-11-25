import {
  BOTH_SCORES_ERROR,
  EVERY_GAME_SCORE_ERROR,
  type GameScore,
  gamesDisagreeError,
  gamesWon,
  PICK_WINNER_ERROR,
  type ScoringKey,
  type ScoringMode,
  scoringMode,
  type Team,
  typedScoreError,
  UNDECIDED_GAMES_ERROR,
  validateResult,
} from '@rotra/schema/scoring'
import { z } from 'zod'

export type { Team }

const team = z.enum(['A', 'B']).nullable()

/**
 * One best-of-3 game row as typed: who won it and its two boxes (owner, November 25, 2026: no
 * Deuce toggle; the winner's box starts at the target and can be raised).
 */
const gameInput = z.object({
  winner: team,
  a: z.string(),
  b: z.string(),
})

const resultInput = z.object({
  /** Pick the winner; follows the typed scores, and in best of 3 the games once one pair won 2 */
  winner: team,
  /** One game: Team A's and Team B's boxes ("" is empty) */
  scoreA: z.string(),
  scoreB: z.string(),
  /** Best of 3: Game 1, Game 2, Game 3 (Game 3 counts only when games 1 and 2 were split) */
  games: z.array(gameInput),
})

export type GameRowInput = z.input<typeof gameInput>
type Boxes = { a: string; b: string }

const isBlank = (value: string) => value.trim() === ''
const wholeNumber = (value: string): number | null => {
  const trimmed = value.trim()
  return /^\d+$/.test(trimmed) ? Number(trimmed) : null
}

/** A score counts only when both boxes are filled; the winner's box alone is a winner-only result */
export const scoreTyped = (o: Boxes) => !isBlank(o.a) && !isBlank(o.b)
/** Anything in either box (Clear score shows) */
export const anyBoxTyped = (o: Boxes) => !isBlank(o.a) || !isBlank(o.b)

/**
 * Who the boxes say won: the higher of two whole scores, or one box alone at the target or more.
 * Typing the scores picks the winner (owner, November 25, 2026).
 */
export function scoreWinner(mode: ScoringMode, o: Boxes): Team | null {
  const a = wholeNumber(o.a),
    b = wholeNumber(o.b)
  if (a !== null && b !== null) return a === b ? null : a > b ? 'A' : 'B'
  if (a !== null && isBlank(o.b) && a >= mode.target) return 'A'
  if (b !== null && isBlank(o.a) && b >= mode.target) return 'B'
  return null
}

/**
 * Picking a team (or a game's winner) fills its box with the target; picking the other team after a
 * mistake trades the two scores. Returns the boxes to set.
 */
export function boxesForPick(mode: ScoringMode, o: Boxes, t: Team): Boxes {
  const T = mode.target
  const mine = t === 'A' ? o.a : o.b,
    other = t === 'A' ? o.b : o.a
  const m = wholeNumber(mine),
    n = wholeNumber(other)
  let next: [string, string] = [mine, other]
  if (n !== null && n >= T && (m === null || m < n)) next = [other, mine]
  else if (m === null || (n !== null && m <= n)) next = [String(T), other]
  return t === 'A' ? { a: next[0], b: next[1] } : { a: next[1], b: next[0] }
}

/** Best of 3: the rows that show (Game 3 only after a split), the games each pair won, the winner */
export function gamesState(games: readonly Pick<GameRowInput, 'winner'>[]) {
  const [g1, g2] = games
  const split = Boolean(g1?.winner && g2?.winner && g1.winner !== g2.winner)
  const visible = split ? [0, 1, 2] : [0, 1]
  const wins = {
    A: visible.filter((i) => games[i]?.winner === 'A').length,
    B: visible.filter((i) => games[i]?.winner === 'B').length,
  }
  const decided: Team | null = wins.A >= 2 ? 'A' : wins.B >= 2 ? 'B' : null
  return { visible, wins, played: visible.filter((i) => games[i]?.winner), decided }
}

type Outcome = { error: string } | { score: GameScore | null }

/** One game as typed: no score (empty, or only the winner's box), the score, or why it is refused. */
function gameOutcome(
  mode: ScoringMode,
  o: Boxes & { winner: Team | null },
  game?: number,
): Outcome {
  const fa = !isBlank(o.a),
    fb = !isBlank(o.b)
  if (!fa && !fb) return { score: null }
  const pre = game === undefined ? '' : `Game ${game + 1}: `
  if (!fa || !fb)
    return (fa ? 'A' : 'B') === o.winner ? { score: null } : { error: `${pre}${BOTH_SCORES_ERROR}` }
  const a = wholeNumber(o.a),
    b = wholeNumber(o.b)
  const error = typedScoreError(mode, a ?? Number.NaN, b ?? Number.NaN, { game })
  return error ? { error } : { score: { a: a as number, b: b as number } }
}

/**
 * Q-MATCH-DONE for the session's scoring mode (Q22). One game: a winner is required (picked, or
 * from the typed scores), the score is optional (both boxes, or only the winner's). Best of 3: the winner alone,
 * or Enter each game (who won each game; scores optional, but every game played or none). Scores the
 * mode cannot produce are refused with the mockup log's copy; the final values pass the shared
 * `validateResult` that `completeMatch` runs. The pick problem sits on `winner`, a one-game score on
 * `scoreA`, a row's score on `games.N.a` and a whole-games problem on `games.root`; the form shows
 * one line.
 */
export function matchResultSchemaFor(scoring: ScoringKey = '31') {
  const mode = scoringMode(scoring)
  return resultInput.transform((values, ctx) => {
    const fail = (message: string, path: (string | number)[]) => {
      ctx.addIssue({ code: 'custom', message, path })
      return z.NEVER
    }
    if (mode.games === 1) {
      const winner = scoreWinner(mode, { a: values.scoreA, b: values.scoreB }) ?? values.winner
      if (!winner) return fail(PICK_WINNER_ERROR, ['winner'])
      const out = gameOutcome(mode, { winner, a: values.scoreA, b: values.scoreB })
      if ('error' in out) return fail(out.error, ['scoreA'])
      const check = validateResult({
        scoring,
        winner,
        scoreA: out.score?.a ?? null,
        scoreB: out.score?.b ?? null,
      })
      if (check.error) return fail(check.error, ['scoreA'])
      return {
        winningTeam: winner,
        teamAScore: out.score?.a ?? null,
        teamBScore: out.score?.b ?? null,
        games: null,
      }
    }

    const winner = values.winner
    const rows = values.games.map((row) => ({
      ...row,
      winner: scoreWinner(mode, row) ?? row.winner,
    }))
    const st = gamesState(rows)
    const used = st.visible.some((i) => rows[i] && (rows[i].winner || scoreTyped(rows[i])))
    if (!used) {
      if (!winner) return fail(PICK_WINNER_ERROR, ['winner'])
      return { winningTeam: winner, teamAScore: null, teamBScore: null, games: null }
    }
    if (!st.decided) return fail(UNDECIDED_GAMES_ERROR, ['games', 'root'])
    if (winner && winner !== st.decided)
      return fail(gamesDisagreeError(st.decided, winner), ['games', 'root'])
    const entered = st.played.filter((i) => scoreTyped(rows[i] as GameRowInput)).length
    if (entered && entered < st.played.length)
      return fail(EVERY_GAME_SCORE_ERROR, ['games', 'root'])
    if (!entered)
      return { winningTeam: st.decided, teamAScore: null, teamBScore: null, games: null }
    const games: GameScore[] = []
    for (const i of st.played) {
      const row = rows[i] as GameRowInput
      const out = gameOutcome(mode, row, i)
      if ('error' in out) return fail(out.error, ['games', i, 'a'])
      if (out.score) games.push(out.score)
    }
    const check = validateResult({ scoring, winner: st.decided, games })
    if (check.error) return fail(check.error, ['games', 'root'])
    const { wins } = gamesWon(games)
    return { winningTeam: st.decided, teamAScore: wins.A, teamBScore: wins.B, games }
  })
}

/** The 16/31 schema (the default mode) */
export const matchResultSchema = matchResultSchemaFor('31')

/** What the fields hold while editing */
export type MatchResultFormInput = z.input<typeof matchResultSchema>
/**
 * What onSubmit receives, as useCompleteMatch takes it: the winner; one game: the score (null = no
 * score, never 0–0); best of 3 with game scores: the games won and every game played, in order.
 * `games` is null for one game and when no game scores were entered.
 */
export type MatchResultFormValues = {
  winningTeam: Team
  teamAScore: number | null
  teamBScore: number | null
  games: GameScore[] | null
}
