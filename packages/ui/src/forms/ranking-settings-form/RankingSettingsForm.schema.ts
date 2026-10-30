import { rankingSettingsField } from '@rotra/schema/ranking-settings'
import type { z } from 'zod'

/**
 * A-RANK-CONFIG: the two weights (whole percentages that total exactly 100) and the leaderboard
 * requirement (a whole number from 1 to 40). The rule lives in @rotra/schema/ranking-settings.
 */
export const rankingSettingsFormSchema = rankingSettingsField

/** The draft as typed: { assessment, performance, threshold } as text. */
export type RankingSettingsFormInput = z.input<typeof rankingSettingsFormSchema>
/** What onSubmit receives: { assessmentPercent, performancePercent, recentStandardMatchThreshold }. */
export type RankingSettingsFormValues = z.output<typeof rankingSettingsFormSchema>
