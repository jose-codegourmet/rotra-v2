export type RankingSettings = { assessmentWeightPercent: number; matchRequirement: number }

/**
 * One saved ranking settings version (ranking_policy_versions). Versions are append-only, so a result
 * can say which settings produced it. Weights are basis points that sum to 10000.
 */
export type RankingPolicyVersion = {
  version: number
  assessmentWeightBp: number
  performanceWeightBp: number
  /** Recent complete standard matches for the overall leaderboard (last three months) */
  recentStandardMatchThreshold: number
  /** ISO time with the Manila offset */
  effectiveAt: string
  createdByEmail: string
  changeNote?: string
}

/** The values a save proposes, in the stored units (basis points and a match count). */
export type RankingDraft = Pick<
  RankingPolicyVersion,
  'assessmentWeightBp' | 'performanceWeightBp' | 'recentStandardMatchThreshold'
> & { changeNote?: string }

/** Which draft value is wrong, and why; `total` is set only when both weights are valid. */
export type RankingDraftErrors = Partial<
  Record<
    'assessmentWeightBp' | 'performanceWeightBp' | 'total' | 'recentStandardMatchThreshold',
    string
  >
>

/** saveRankingSettings input: `baseVersion` is the version the draft was edited from. */
export type SaveRankingSettingsInput = { draft: RankingDraft; baseVersion: number }

/** A-RANK-CONFIG read: the version in effect (the newest) and every version, oldest first. */
export type RankingPolicy = { effective: RankingPolicyVersion; versions: RankingPolicyVersion[] }

/** One D-CONFIG comparison row; same shape as @rotra/ui ConfigDiffRow. Weights are percentages. */
export type RankingDiffRow = { label: string; from: number; to: number; unit: string }
