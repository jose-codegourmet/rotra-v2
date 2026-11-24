/**
 * Scoring modes (Q22, D-2026-11-18-04): how games are scored in one Queue Session. One table drives
 * setup, the match result dialog, history and seed data. A session saved before the setting has no
 * value and reads as 16/31 (`scoringOf`).
 *
 * The result check here is the shared queue rule `validateResult` (Go copy:
 * apps/api/internal/rules/match/match.go, cases: packages/rule-cases/cases/v1/match/validateResult.json).
 *
 * `expectedFinish` (Q27.6, D-2026-11-23-08) is a time rule the device and the server both use. It is
 * written here first, with cases in packages/rule-cases/cases/v1/courts/expectedFinish.json; the Go
 * copy in apps/api/internal/rules/courts and the .wasm rebuild follow before the next Go merge.
 */

export type ScoringKey = '31' | '31nd' | '21' | '21x3' | '21x3nd'
export type Team = 'A' | 'B'
/** One game's score: Team A's points and Team B's points. */
export type GameScore = { a: number; b: number }

export type ScoringMode = {
  /** Bold choice label, also the "Scoring · <label>" display */
  label: string
  /** The rule under the label */
  text: string
  /** Points that win a game */
  target: number
  /** 1: one game; 3: best of 3 games */
  games: 1 | 3
  /** true: at target − 1 all, the first pair to lead by 2 wins (no cap) */
  deuce: boolean
  /** Expected match length in minutes (D-2026-11-23-08): how long a match usually takes */
  typical: number
  /** Expected match length in minutes: past this a match is Running long */
  long: number
}

export const SCORING: Record<ScoringKey, ScoringMode> = {
  '31': {
    label: '16/31',
    text: 'One game to 31. Change sides at 16. Deuce at 30–30.',
    target: 31,
    games: 1,
    deuce: true,
    typical: 15,
    long: 25,
  },
  '31nd': {
    label: '16/31, no deuce',
    text: 'One game to 31. Change sides at 16. The first to 31 wins.',
    target: 31,
    games: 1,
    deuce: false,
    typical: 15,
    long: 18,
  },
  '21': {
    label: '11/21',
    text: 'One game to 21. Change sides at 11. Deuce at 20–20.',
    target: 21,
    games: 1,
    deuce: true,
    typical: 10,
    long: 15,
  },
  '21x3': {
    label: '11/21 × 3',
    text: 'Best of 3 games to 21. Change sides at 11. Deuce at 20–20.',
    target: 21,
    games: 3,
    deuce: true,
    typical: 25,
    long: 35,
  },
  '21x3nd': {
    label: '21 × 3',
    text: 'Best of 3 games to 21. Change sides after each game. No deuce: the first to 21 wins.',
    target: 21,
    games: 3,
    deuce: false,
    typical: 25,
    long: 30,
  },
}
/** The order the setup choices list in (integer-like object keys would otherwise sort first). */
export const SCORING_KEYS: readonly ScoringKey[] = ['31', '31nd', '21', '21x3', '21x3nd']
export const DEFAULT_SCORING: ScoringKey = '31'

export const isScoringKey = (value: unknown): value is ScoringKey =>
  typeof value === 'string' && Object.hasOwn(SCORING, value)
/** The stored value, or 16/31 when it is missing or unknown (sessions saved before the setting). */
export const scoringOf = (value: unknown): ScoringKey =>
  isScoringKey(value) ? value : DEFAULT_SCORING
/** The mode's row of the table, from a stored value (missing or unknown reads as 16/31). */
export const scoringMode = (value: unknown): ScoringMode => SCORING[scoringOf(value)]

const isWhole = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0

/** The highest losing score a single-box entry accepts: target − 2 with deuce, target − 1 without. */
export const losingScoreMax = (mode: ScoringMode) =>
  mode.deuce ? mode.target - 2 : mode.target - 1

/**
 * Whether one game's score is one the mode can produce. No deuce: the winner has exactly the target
 * and the loser 0 to target − 1. Deuce: the winner has the target and the loser at most target − 2,
 * or the winner has more than the target and leads by exactly 2 (no cap). 31–30 is never valid.
 */
export function gameScoreValid(mode: ScoringMode, winnerScore: number, loserScore: number) {
  const T = mode.target
  if (!isWhole(winnerScore) || !isWhole(loserScore)) return false
  return mode.deuce
    ? (winnerScore === T && loserScore <= T - 2) ||
        (winnerScore > T && winnerScore - loserScore === 2)
    : winnerScore === T && loserScore <= T - 1
}

// ---- Refusal copy (mockup log 2026-11-18-queue-scoring-modes) ----
export const PICK_WINNER_ERROR = 'Pick the winner.'
export const losingScoreRangeError = (mode: ScoringMode) =>
  `Enter the losing score as a whole number from 0 to ${losingScoreMax(mode)}.`
/** `row`: a best-of-3 game row, whose switch is Deuce for this game, not Went to deuce. */
export const goesToDeuceError = (mode: ScoringMode, row = false) =>
  `At ${mode.target - 1}–${mode.target - 1} the game goes to deuce. Turn on ${row ? 'Deuce for this game' : 'Went to deuce'} and type both scores.`
export const deuceLeadError = (mode: ScoringMode) =>
  `A deuce game ends when one pair leads by 2, like ${mode.target + 1}–${mode.target - 1}.`
export const scoreDisagreesError = (byScore: Team, picked: Team) =>
  `The score says Team ${byScore} won, but Team ${picked} is picked. Fix one of them.`
export const gamesDisagreeError = (byGames: Team, picked: Team) =>
  `The games say Team ${byGames} won, but Team ${picked} is picked. Fix one of them.`
export const EVERY_GAME_SCORE_ERROR = 'Enter a score for every game played, or clear them all.'
export const UNDECIDED_GAMES_ERROR =
  'Pick who won each game. One pair must win 2 games to decide the match.'
/** Game scores sent for a one-game mode (not reachable from the result dialog). */
export const ONE_GAME_ONLY_ERROR =
  'This scoring mode has one game. Enter one score, not game scores.'
/** "Game 2: " in front of a best-of-3 row's message. */
export const gamePrefix = (index: number) => `Game ${index + 1}: `

/**
 * One game's score check: an error message, or null when the score is one the mode can produce.
 * `winner` is who won the game (the picked winner for one game, the row's pick for best of 3).
 *
 * `deuceEntry` says how the score was typed: true for the two boxes of Went to deuce / Deuce, false
 * for the single losing-score box (the winner's side is fixed at the target). Leave it out for a
 * stored score: a side above the target reads as a deuce entry, anything else as the single box.
 * The two readings differ only in which message a wrong score gets.
 *
 * `game`: the 0-based best-of-3 row; its messages get the "Game N: " prefix and the row's switch name.
 */
export function gameScoreError(
  mode: ScoringMode,
  input: { winner: Team; a: number | null; b: number | null; deuceEntry?: boolean },
  options: { game?: number } = {},
): string | null {
  const T = mode.target,
    { winner, a, b } = input,
    row = options.game !== undefined,
    pre = row ? gamePrefix(options.game as number) : ''
  const range = () => `${pre}${losingScoreRangeError(mode)}`
  const lead = () => `${pre}${deuceLeadError(mode)}`
  if (!isWhole(a) || !isWhole(b)) return mode.deuce && input.deuceEntry ? lead() : range()
  const deuceEntry = mode.deuce && (input.deuceEntry ?? Math.max(a, b) > T)
  if (deuceEntry) {
    // Two typed boxes: the game must end with one pair above the target, 2 ahead.
    if (Math.max(a, b) <= T || Math.abs(a - b) !== 2) return lead()
    const by: Team = a > b ? 'A' : 'B'
    return by === winner ? null : `${pre}${scoreDisagreesError(by, winner)}`
  }
  // The single box: the winner's side is the target, the loser's side is the typed score.
  if (a !== b) {
    const by: Team = a > b ? 'A' : 'B'
    if (by !== winner) return `${pre}${scoreDisagreesError(by, winner)}`
  } else if (mode.deuce && a >= T - 1) return lead()
  const won = winner === 'A' ? a : b,
    lost = winner === 'A' ? b : a
  if (won !== T) return range()
  if (lost > losingScoreMax(mode))
    return mode.deuce && lost === T - 1 ? `${pre}${goesToDeuceError(mode, row)}` : range()
  return null
}

/** A result as stored on a completed match (and as `completeMatch` takes it). */
export type ResultValues = {
  /** The session's scoring mode; missing or unknown reads as 16/31 */
  scoring?: string | null
  winner?: Team | null
  /** One game: the points. Best of 3: games won, derived from `games` (what is passed is not read). */
  scoreA?: number | null
  scoreB?: number | null
  /** Best of 3 only: every game played, in order */
  games?: { a: number | null; b: number | null }[] | null
}
export type ResultCheck = { winner: Team; error: null } | { winner: null; error: string }

const fail = (error: string): ResultCheck => ({ winner: null, error })
const won = (winner: Team): ResultCheck => ({ winner, error: null })
const isTeam = (value: unknown): value is Team => value === 'A' || value === 'B'

/** Best of 3: the games each pair won and the match winner, when the games decide one. */
export function gamesWon(games: readonly GameScore[]) {
  const wins = {
    A: games.filter((g) => g.a > g.b).length,
    B: games.filter((g) => g.b > g.a).length,
  }
  return { wins, decided: wins.A >= 2 ? ('A' as Team) : wins.B >= 2 ? ('B' as Team) : null }
}

/**
 * The mode's result check for a stored result: the winner, or the message that refuses it. A
 * winner-only result is valid in every mode. One game: the winner must be picked and the score, if
 * any, is one the mode can produce with that winner. Best of 3: game scores, if any, must be two
 * games won by one pair, or a split followed by a third, each one valid, and agree with a picked
 * winner (the games decide the winner when none is picked).
 */
export function validateResult(input: ResultValues): ResultCheck {
  const mode = scoringMode(input.scoring),
    winner = isTeam(input.winner) ? input.winner : null,
    games = input.games ?? []
  if (mode.games === 1) {
    if (games.length) return fail(ONE_GAME_ONLY_ERROR)
    if (!winner) return fail(PICK_WINNER_ERROR)
    if (input.scoreA == null && input.scoreB == null) return won(winner)
    const error = gameScoreError(mode, { winner, a: input.scoreA ?? null, b: input.scoreB ?? null })
    return error ? fail(error) : won(winner)
  }
  if (!games.length) {
    if (input.scoreA != null || input.scoreB != null) return fail(EVERY_GAME_SCORE_ERROR)
    return winner ? won(winner) : fail(PICK_WINNER_ERROR)
  }
  if (games.some((g) => g.a == null || g.b == null)) return fail(EVERY_GAME_SCORE_ERROR)
  // A game nobody won (a tie, or not whole numbers) cannot be counted: its row says why.
  for (const [i, g] of games.entries()) {
    if (isWhole(g.a) && isWhole(g.b) && g.a !== g.b) continue
    return fail(
      gameScoreError(mode, { winner: 'A', a: g.a, b: g.b }, { game: i }) ?? UNDECIDED_GAMES_ERROR,
    )
  }
  const scored = games as GameScore[],
    firstTwo = gamesWon(scored.slice(0, 2)),
    { decided } = gamesWon(scored)
  // Two games won by one pair, or a 1–1 split and a third: nothing after the match is decided.
  if (scored.length > 3 || !decided || (scored.length === 3 && firstTwo.decided))
    return fail(UNDECIDED_GAMES_ERROR)
  if (winner && winner !== decided) return fail(gamesDisagreeError(decided, winner))
  for (const [i, g] of scored.entries()) {
    const error = gameScoreError(
      mode,
      { winner: g.a > g.b ? 'A' : 'B', a: g.a, b: g.b },
      { game: i },
    )
    if (error) return fail(error)
  }
  return won(decided)
}

// ---- Expected finish (Q27.6, D-2026-11-23-08; mockup log 2026-11-23-queue-plan-ahead-court-finish) ----

/**
 * Where a match stands against its mode's expected length: `notStarted` (Getting ready), `mid`
 * (Ends in about N min), `soon` (Finishing soon), `any` (Could end any time), `long` (Running long).
 */
export type ExpectedFinishPhase = 'notStarted' | 'mid' | 'soon' | 'any' | 'long'
export type ExpectedFinish = {
  phase: ExpectedFinishPhase
  /** Expected minutes left: the full typical length when not started, 0 from the typical length on */
  minutesLeft: number
  /** The Playing court card's line: "Ends in about 4 min", "Finishing soon", … */
  text: string
  /** The same wording in lowercase, for a draft's "Waits for Court 2 · …" line */
  tag: string
}
/** The phases Plan Ahead counts as finishing soon: Finishing soon, Could end any time, Running long. */
export const ENDING_SOON_PHASES: readonly ExpectedFinishPhase[] = ['soon', 'any', 'long']
/** Finishing soon starts this many minutes before the typical length. */
export const FINISHING_SOON_MINUTES = 3

/**
 * The expected finish of a match, an estimate from time only (ROTRA has no live score). `scoring`
 * is the session's stored mode (missing or unknown reads as 16/31); `minutesPlayed` is whole
 * minutes since Start match, or null for a Getting ready match (not started), which counts the
 * full typical length. With `p` minutes played: `p < typical − 3` Ends in about N min (N at least
 * 1); `typical − 3 ≤ p < typical` Finishing soon; `typical ≤ p < long` Could end any time (deuce
 * modes add " · may be in deuce"); `p ≥ long` Running long.
 */
export function expectedFinish(scoring: unknown, minutesPlayed: number | null): ExpectedFinish {
  const mode = scoringMode(scoring)
  if (minutesPlayed == null)
    return {
      phase: 'notStarted',
      minutesLeft: mode.typical,
      text: 'Not started yet',
      tag: 'not started yet',
    }
  const played = Math.max(0, minutesPlayed),
    minutesLeft = Math.max(0, mode.typical - played)
  if (played < mode.typical - FINISHING_SOON_MINUTES) {
    const n = Math.max(1, minutesLeft)
    return {
      phase: 'mid',
      minutesLeft,
      text: `Ends in about ${n} min`,
      tag: `ends in about ${n} min`,
    }
  }
  if (played < mode.typical)
    return { phase: 'soon', minutesLeft, text: 'Finishing soon', tag: 'finishing soon' }
  if (played < mode.long)
    return {
      phase: 'any',
      minutesLeft: 0,
      text: `Could end any time${mode.deuce ? ' · may be in deuce' : ''}`,
      tag: 'could end any time',
    }
  return { phase: 'long', minutesLeft: 0, text: 'Running long', tag: 'running long' }
}
