import {
  EVERY_GAME_SCORE_ERROR,
  type GameScore,
  gamePrefix,
  gameScoreError,
  gamesDisagreeError,
  gamesWon,
  goesToDeuceError,
  losingScoreMax,
  losingScoreRangeError,
  PICK_WINNER_ERROR,
  type ScoringKey,
  type ScoringMode,
  scoringMode,
  type Team,
  UNDECIDED_GAMES_ERROR,
  validateResult,
} from '@rotra/schema/scoring'
import { z } from 'zod'

export type { Team }

const team = z.enum(['A', 'B']).nullable()

/** One best-of-3 game row as typed: who won it, its Deuce toggle, the losing box, the two deuce boxes */
const gameInput = z.object({
  winner: team,
  deuce: z.boolean(),
  /** The losing-score box ("" is no score); the winner's side is the fixed target */
  lose: z.string(),
  /** The two boxes while Deuce is on */
  a: z.string(),
  b: z.string(),
})

const resultInput = z.object({
  /** Pick the winner; best of 3: follows the games once one pair has won 2 */
  winner: team,
  /** One game, deuce modes: Went to deuce (two boxes instead of the losing box) */
  deuce: z.boolean(),
  /** One game: the losing-score box; "" is no score */
  lose: z.string(),
  /** One game with Went to deuce on: Team A's and Team B's typed scores */
  scoreA: z.string(),
  scoreB: z.string(),
  /** Best of 3: Game 1, Game 2, Game 3 (Game 3 counts only when games 1 and 2 were split) */
  games: z.array(gameInput),
})

export type GameRowInput = z.input<typeof gameInput>

const isBlank = (value: string) => value.trim() === ''
const wholeNumber = (value: string): number | null => {
  const trimmed = value.trim()
  return /^\d+$/.test(trimmed) ? Number(trimmed) : null
}

/** Whether a game (or the one-game area) has anything typed in its score boxes */
export const scoreTyped = (o: { deuce: boolean; lose: string; a: string; b: string }) =>
  o.deuce ? !isBlank(o.a) || !isBlank(o.b) : !isBlank(o.lose)

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

type Typed = { winner: Team; deuce: boolean; lose: string; a: string; b: string }
type Outcome = { error: string } | { score: GameScore | null }

/**
 * One game as typed: no score, the score, or the message that refuses it. The losing box is checked
 * for its range first (0 to target − 2 with deuce, target − 1 without; target − 1 with deuce says to
 * turn the switch on), then the shared `gameScoreError` checks the game.
 */
function gameOutcome(mode: ScoringMode, o: Typed, game?: number): Outcome {
  const deuceEntry = mode.deuce && o.deuce
  if (!scoreTyped({ ...o, deuce: deuceEntry })) return { score: null }
  const T = mode.target,
    pre = game === undefined ? '' : gamePrefix(game)
  let a: number | null, b: number | null
  if (deuceEntry) {
    a = wholeNumber(o.a)
    b = wholeNumber(o.b)
  } else {
    const lost = wholeNumber(o.lose)
    if (lost === null || lost > losingScoreMax(mode))
      return {
        error:
          mode.deuce && lost === T - 1
            ? `${pre}${goesToDeuceError(mode, game !== undefined)}`
            : `${pre}${losingScoreRangeError(mode)}`,
      }
    a = o.winner === 'A' ? T : lost
    b = o.winner === 'A' ? lost : T
  }
  const error = gameScoreError(mode, { winner: o.winner, a, b, deuceEntry }, { game })
  return error ? { error } : { score: { a: a as number, b: b as number } }
}

/**
 * Q-MATCH-DONE for the session's scoring mode (Q22). One game: Pick the winner is required, the
 * score is optional (the losing box, or both boxes with Went to deuce). Best of 3: the winner alone,
 * or Enter each game (who won each game; scores optional, but every game played or none). Scores the
 * mode cannot produce are refused with the mockup log's copy; the final values pass the shared
 * `validateResult` that `completeMatch` runs. The pick problem sits on `winner`, a one-game score on
 * `lose`, a row's score on `games.N.lose` and a whole-games problem on `games.root`; the form shows
 * one line.
 */
export function matchResultSchemaFor(scoring: ScoringKey = '31') {
  const mode = scoringMode(scoring)
  return resultInput.transform((values, ctx) => {
    const fail = (message: string, path: (string | number)[]) => {
      ctx.addIssue({ code: 'custom', message, path })
      return z.NEVER
    }
    const { winner } = values
    if (mode.games === 1) {
      if (!winner) return fail(PICK_WINNER_ERROR, ['winner'])
      const out = gameOutcome(mode, {
        winner,
        deuce: values.deuce,
        lose: values.lose,
        a: values.scoreA,
        b: values.scoreB,
      })
      if ('error' in out) return fail(out.error, ['lose'])
      const check = validateResult({
        scoring,
        winner,
        scoreA: out.score?.a ?? null,
        scoreB: out.score?.b ?? null,
      })
      if (check.error) return fail(check.error, ['lose'])
      return {
        winningTeam: winner,
        teamAScore: out.score?.a ?? null,
        teamBScore: out.score?.b ?? null,
        games: null,
      }
    }

    const rows = values.games
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
      const out = gameOutcome(mode, { ...row, winner: row.winner as Team }, i)
      if ('error' in out) return fail(out.error, ['games', i, 'lose'])
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
