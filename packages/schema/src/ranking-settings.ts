import { z } from 'zod'

export const RANKING_WEIGHT_ERROR = 'Use a whole number from 0 to 100.'
/** Most recent standard matches the leaderboard can require (product owner, 2026-10-30). */
export const RANKING_THRESHOLD_MAX = 40
export const RANKING_THRESHOLD_ERROR = 'Use a whole number from 1 to 40.'

/** The total message, naming what the two weights add up to. */
export const rankingWeightTotalError = (total: number) =>
  `The two weights add up to ${total}%. They must total exactly 100%.`

/** The ranking settings draft as typed: whole numbers as text, so invalid text is kept as typed. */
export type RankingSettingsInput = { assessment: string; performance: string; threshold: string }

/** Which draft value is wrong, and why; `total` is the weights' sum when each weight is valid. */
export type RankingSettingsErrors = Partial<Record<keyof RankingSettingsInput | 'total', string>>

/** Text → whole number when it is only digits (surrounding spaces allowed), else null. */
export function parseWholeNumber(value: string | null | undefined): number | null {
  const text = String(value ?? '').trim()
  if (!/^\d+$/.test(text)) return null
  const number = Number(text)
  return Number.isSafeInteger(number) ? number : null
}

/**
 * rotra-admin.html cfgCheck(): each weight a whole percentage 0–100, the two summing to exactly 100
 * (checked only once both weights are valid), and the leaderboard requirement a whole number from 1
 * to RANKING_THRESHOLD_MAX (the prototype caps at 100; the product owner set 40 on 2026-10-30).
 * Whole percentages only, so a displayed 100% is always a stored 100%.
 */
export function rankingSettingsErrors(input: RankingSettingsInput): RankingSettingsErrors {
  const errors: RankingSettingsErrors = {}
  const assessment = parseWholeNumber(input.assessment)
  const performance = parseWholeNumber(input.performance)
  const threshold = parseWholeNumber(input.threshold)
  if (assessment === null || assessment > 100) errors.assessment = RANKING_WEIGHT_ERROR
  if (performance === null || performance > 100) errors.performance = RANKING_WEIGHT_ERROR
  if (!errors.assessment && !errors.performance && assessment !== null && performance !== null) {
    const total = assessment + performance
    if (total !== 100) errors.total = rankingWeightTotalError(total)
  }
  if (threshold === null || threshold < 1 || threshold > RANKING_THRESHOLD_MAX)
    errors.threshold = RANKING_THRESHOLD_ERROR
  return errors
}

/**
 * The ranking settings draft: accepts RankingSettingsInput text and parses to whole numbers
 * { assessmentPercent, performancePercent, recentStandardMatchThreshold }. Issues sit on
 * `assessment`, `performance`, `threshold`, and on `total` when the weights don't sum to 100.
 */
export const rankingSettingsField = z
  .object({ assessment: z.string(), performance: z.string(), threshold: z.string() })
  .superRefine((input, ctx) => {
    for (const [path, message] of Object.entries(rankingSettingsErrors(input))) {
      ctx.addIssue({ code: 'custom', path: [path], message })
    }
  })
  .transform((input) => ({
    assessmentPercent: Number(input.assessment.trim()),
    performancePercent: Number(input.performance.trim()),
    recentStandardMatchThreshold: Number(input.threshold.trim()),
  }))

export type RankingSettingsValues = z.output<typeof rankingSettingsField>
