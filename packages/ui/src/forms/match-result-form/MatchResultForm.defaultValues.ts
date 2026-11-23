import { type ScoringKey, scoringMode } from '@rotra/schema/scoring'
import type {
  GameRowInput,
  MatchResultFormInput,
  MatchResultFormValues,
} from './MatchResultForm.schema'

/** A best-of-3 game row with nothing picked or typed */
export const emptyGameRow = (): GameRowInput => ({
  winner: null,
  deuce: false,
  lose: '',
  a: '',
  b: '',
})

/**
 * The sheet opens with no winner picked, Went to deuce off, every box blank and three empty game
 * rows (the prototype's newResultSheet()).
 */
export const matchResultFormDefaultValues: MatchResultFormInput = {
  winner: null,
  deuce: false,
  lose: '',
  scoreA: '',
  scoreB: '',
  games: [emptyGameRow(), emptyGameRow(), emptyGameRow()],
}

/**
 * Back to result: the fields that give back `values` in this scoring mode. A score above the target
 * reopens with Went to deuce (or the row's Deuce) on and both boxes; any other score fills the
 * losing box.
 */
export function matchResultInputOf(
  values: MatchResultFormValues,
  scoring: ScoringKey = '31',
): MatchResultFormInput {
  const mode = scoringMode(scoring),
    T = mode.target
  const typed = (a: number, b: number) => {
    const deuce = mode.deuce && Math.max(a, b) > T
    return deuce
      ? { deuce, lose: '', a: String(a), b: String(b) }
      : { deuce, lose: String(Math.min(a, b)), a: '', b: '' }
  }
  const base = { ...matchResultFormDefaultValues, winner: values.winningTeam }
  if (mode.games === 3) {
    const rows = (values.games ?? []).map(
      (g): GameRowInput => ({ winner: g.a > g.b ? 'A' : 'B', ...typed(g.a, g.b) }),
    )
    return {
      ...base,
      games: [0, 1, 2].map((i) => rows[i] ?? emptyGameRow()),
    }
  }
  if (values.teamAScore === null || values.teamBScore === null) return base
  const { deuce, lose, a, b } = typed(values.teamAScore, values.teamBScore)
  return { ...base, deuce, lose, scoreA: a, scoreB: b }
}

/** "Mikee", "Mikee and Dexter", "Mikee, Dexter and Gab": the prototype's listNames(). */
export function listNames(names: string[]): string {
  return names.length < 3
    ? names.join(' and ')
    : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`
}
