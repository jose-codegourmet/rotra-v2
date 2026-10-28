import { z } from 'zod'

export const PICK_WINNER_ERROR = 'Pick a winner or enter the final score.'
export const WHOLE_SCORES_ERROR = 'Enter both scores as whole numbers, or clear them.'
export const TIE_ERROR =
  'A tie can’t decide a winner. Correct the score, or clear it and pick a winner.'
export const scoreDisagreesError = (byScore: Team, picked: Team) =>
  `The score says Team ${byScore} won, but Team ${picked} is picked. Fix one of them.`

export type Team = 'A' | 'B'

/** A typed score: blank is no score; anything else must be a whole number 0 or more. */
const isBlank = (value: string) => value.trim() === ''
const wholeNumber = (value: string): number | null => {
  const trimmed = value.trim()
  return /^\d+$/.test(trimmed) ? Number(trimmed) : null
}

/**
 * Q-MATCH-DONE: pick the winner, or enter the final score (both whole numbers ≥ 0, the higher wins,
 * no tie, no fixed target such as 21). Blank scores are no score, never 0–0. A valid score sets the
 * winner; a picked winner must agree with it. Mirrors validateResult() in @rotra/data/match/match.rules.
 * The "pick" problem sits on `winner`, the score problems on `scoreA`; the form shows one line.
 */
export const matchResultSchema = z
  .object({
    winner: z.enum(['A', 'B']).nullable(),
    /** What the Team A score field holds; "" is no score */
    scoreA: z.string(),
    /** What the Team B score field holds; "" is no score */
    scoreB: z.string(),
  })
  .transform((values, ctx) => {
    const { winner, scoreA, scoreB } = values
    if (!isBlank(scoreA) || !isBlank(scoreB)) {
      const a = wholeNumber(scoreA)
      const b = wholeNumber(scoreB)
      if (a === null || b === null) {
        ctx.addIssue({ code: 'custom', message: WHOLE_SCORES_ERROR, path: ['scoreA'] })
        return z.NEVER
      }
      if (a === b) {
        ctx.addIssue({ code: 'custom', message: TIE_ERROR, path: ['scoreA'] })
        return z.NEVER
      }
      const byScore: Team = a > b ? 'A' : 'B'
      if (winner && winner !== byScore) {
        ctx.addIssue({
          code: 'custom',
          message: scoreDisagreesError(byScore, winner),
          path: ['scoreA'],
        })
        return z.NEVER
      }
      return { winningTeam: byScore, teamAScore: a, teamBScore: b }
    }
    if (winner !== 'A' && winner !== 'B') {
      ctx.addIssue({ code: 'custom', message: PICK_WINNER_ERROR, path: ['winner'] })
      return z.NEVER
    }
    return { winningTeam: winner, teamAScore: null, teamBScore: null }
  })

/** What the fields hold while editing */
export type MatchResultFormInput = z.input<typeof matchResultSchema>
/** What onSubmit receives: the winner and the scores (null = no score), as useCompleteMatch takes */
export type MatchResultFormValues = z.output<typeof matchResultSchema>
