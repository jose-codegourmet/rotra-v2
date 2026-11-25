import type { ScoringKey } from '@rotra/schema/scoring'
import type {
  GameRowInput,
  MatchResultFormInput,
  MatchResultFormValues,
} from './MatchResultForm.schema'

/** A best-of-3 game row with nothing picked or typed */
export const emptyGameRow = (): GameRowInput => ({ winner: null, a: '', b: '' })

/**
 * The sheet opens with no winner picked, both boxes blank and three empty game rows (the
 * prototype's newResultSheet()). Owner, November 25, 2026: no deuce switch.
 */
export const matchResultFormDefaultValues: MatchResultFormInput = {
  winner: null,
  scoreA: '',
  scoreB: '',
  games: [emptyGameRow(), emptyGameRow(), emptyGameRow()],
}

/** Back to result: the fields that give back `values` (both boxes as stored). */
export function matchResultInputOf(
  values: MatchResultFormValues,
  _scoring: ScoringKey = '31',
): MatchResultFormInput {
  const base = { ...matchResultFormDefaultValues, winner: values.winningTeam }
  if (values.games?.length) {
    const rows = values.games.map(
      (g): GameRowInput => ({ winner: g.a > g.b ? 'A' : 'B', a: String(g.a), b: String(g.b) }),
    )
    return { ...base, games: [0, 1, 2].map((i) => rows[i] ?? emptyGameRow()) }
  }
  if (values.teamAScore === null || values.teamBScore === null) return base
  return { ...base, scoreA: String(values.teamAScore), scoreB: String(values.teamBScore) }
}

/** "Mikee", "Mikee and Dexter", "Mikee, Dexter and Gab": the prototype's listNames(). */
export function listNames(names: string[]): string {
  return names.length < 3
    ? names.join(' and ')
    : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`
}
