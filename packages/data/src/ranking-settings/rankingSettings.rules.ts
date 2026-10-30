import {
  RANKING_THRESHOLD_ERROR,
  RANKING_THRESHOLD_MAX,
  RANKING_WEIGHT_ERROR,
  rankingWeightTotalError,
} from '@rotra/schema/ranking-settings'
import type {
  RankingDiffRow,
  RankingDraft,
  RankingDraftErrors,
  RankingPolicyVersion,
  RankingSettings,
} from './rankingSettings.types'

// Pure ranking settings rules (ranking_policy_versions). These only describe and append versions;
// no stored rank is recalculated here. Whether a save recalculates existing ranks or applies from now
// on is an open decision (business open-decisions.md, 'Admin configuration').

/** The two weights always total this many basis points (100%). */
export const BASIS_POINTS_TOTAL = 10000

/** 70 → 7000. Rounded, so a whole percentage always maps to whole basis points. */
export function percentToBasisPoints(percent: number): number {
  return Math.round(percent * 100)
}

/** 7000 → 70. */
export function basisPointsToPercent(basisPoints: number): number {
  return basisPoints / 100
}

const isWeight = (value: number) =>
  Number.isInteger(value) && value >= 0 && value <= BASIS_POINTS_TOTAL

/**
 * The database checks (each weight 0–10000 basis points, the two summing to 10000, the threshold a
 * positive whole number) plus the product owner's 40-match cap (2026-10-30). Copy is the form's
 * (@rotra/schema/ranking-settings), so a refused save reads like the field rule.
 */
export function validateRankingDraft(draft: RankingDraft): RankingDraftErrors {
  const errors: RankingDraftErrors = {}
  if (!isWeight(draft.assessmentWeightBp)) errors.assessmentWeightBp = RANKING_WEIGHT_ERROR
  if (!isWeight(draft.performanceWeightBp)) errors.performanceWeightBp = RANKING_WEIGHT_ERROR
  if (!errors.assessmentWeightBp && !errors.performanceWeightBp) {
    const total = draft.assessmentWeightBp + draft.performanceWeightBp
    if (total !== BASIS_POINTS_TOTAL)
      errors.total = rankingWeightTotalError(basisPointsToPercent(total))
  }
  const threshold = draft.recentStandardMatchThreshold
  if (!Number.isInteger(threshold) || threshold < 1 || threshold > RANKING_THRESHOLD_MAX)
    errors.recentStandardMatchThreshold = RANKING_THRESHOLD_ERROR
  return errors
}

/** The version in effect: the newest (rotra-admin.html eff()). */
export function effectiveRankingVersion(
  versions: readonly RankingPolicyVersion[],
): RankingPolicyVersion {
  const effective = versions.reduce<RankingPolicyVersion | undefined>(
    (newest, entry) => (!newest || entry.version > newest.version ? entry : newest),
    undefined,
  )
  if (!effective) throw new Error('No ranking settings version is saved.')
  return effective
}

/** The reader shape Player Information, Queue and Admin players use, from one version. */
export function rankingSettingsOf(version: RankingPolicyVersion): RankingSettings {
  return {
    assessmentWeightPercent: basisPointsToPercent(version.assessmentWeightBp),
    matchRequirement: version.recentStandardMatchThreshold,
  }
}

/** D-CONFIG rows (rotra-admin.html sheets.config): every setting, changed or not, as percentages. */
export function diffRows(effective: RankingPolicyVersion, draft: RankingDraft): RankingDiffRow[] {
  return [
    {
      label: 'Club assessment',
      from: basisPointsToPercent(effective.assessmentWeightBp),
      to: basisPointsToPercent(draft.assessmentWeightBp),
      unit: '%',
    },
    {
      label: 'Match performance',
      from: basisPointsToPercent(effective.performanceWeightBp),
      to: basisPointsToPercent(draft.performanceWeightBp),
      unit: '%',
    },
    {
      label: 'Leaderboard requirement',
      from: effective.recentStandardMatchThreshold,
      to: draft.recentStandardMatchThreshold,
      unit: ' matches',
    },
  ]
}

/** Epoch milliseconds → ISO time with the Manila offset, e.g. '2026-01-05T09:00:00+08:00'. */
export function manilaIsoString(milliseconds: number): string {
  return `${new Date(milliseconds + 8 * 3_600_000).toISOString().slice(0, 19)}+08:00`
}

/**
 * The version a save appends after `effective`: version + 1, never an edit of an older one. An empty
 * change note is left out.
 */
export function nextRankingPolicyVersion(
  effective: RankingPolicyVersion,
  draft: RankingDraft,
  by: { createdByEmail: string; at: number },
): RankingPolicyVersion {
  const changeNote = draft.changeNote?.trim()
  return {
    version: effective.version + 1,
    assessmentWeightBp: draft.assessmentWeightBp,
    performanceWeightBp: draft.performanceWeightBp,
    recentStandardMatchThreshold: draft.recentStandardMatchThreshold,
    effectiveAt: manilaIsoString(by.at),
    createdByEmail: by.createdByEmail,
    ...(changeNote ? { changeNote } : {}),
  }
}
