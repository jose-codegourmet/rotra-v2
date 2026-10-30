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
