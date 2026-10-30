import type {
  RankingSettingsFormInput,
  RankingSettingsFormValues,
} from './RankingSettingsForm.schema'

/**
 * The agreed initial settings: 70% assessment, 30% performance, 10 matches. The container passes the
 * effective version instead, through rankingSettingsDraftFrom.
 */
export const rankingSettingsDefaultValues: RankingSettingsFormInput = {
  assessment: '70',
  performance: '30',
  threshold: '10',
}

/** A fresh draft from saved values (the effective version), as the fields hold it. */
export function rankingSettingsDraftFrom(
  values: RankingSettingsFormValues,
): RankingSettingsFormInput {
  return {
    assessment: String(values.assessmentPercent),
    performance: String(values.performancePercent),
    threshold: String(values.recentStandardMatchThreshold),
  }
}

/**
 * rotra-admin.html cfgDirty(): the draft differs from the baseline when any value no longer equals
 * it as a number, or any field is empty.
 */
export function isRankingDraftDirty(
  draft: RankingSettingsFormInput,
  baseline: RankingSettingsFormValues,
): boolean {
  const pairs: [string, number][] = [
    [draft.assessment, baseline.assessmentPercent],
    [draft.performance, baseline.performancePercent],
    [draft.threshold, baseline.recentStandardMatchThreshold],
  ]
  return pairs.some(([text, saved]) => text.trim() === '' || Number(text) !== saved)
}
