import 'server-only'
import { prisma } from '../client/prisma'
import { toIso } from '../service/serialize'

/**
 * `ranking.settings` public read for Player Information (leaderboard, profile, rank detail): the
 * saved versions' public numbers only. Admin change notes and names stay in Admin's own read.
 */
export async function readPublicRankingPolicies() {
  const policies = await prisma.rankingPolicyVersion.findMany({ orderBy: { version: 'asc' } })
  return policies.map((policy) => ({
    version: policy.version,
    effectiveAt: toIso(policy.effectiveAt),
    assessmentWeightBp: policy.assessmentWeightBp,
    performanceWeightBp: policy.performanceWeightBp,
    recentStandardMatchThreshold: policy.recentStandardMatchThreshold,
    changeNote: '',
    createdByDisplayName: '',
  }))
}
