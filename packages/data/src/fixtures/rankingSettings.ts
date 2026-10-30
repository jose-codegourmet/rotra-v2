import type {
  RankingPolicyVersion,
  RankingSettings,
} from '../ranking-settings/rankingSettings.types'
import { adminAccount } from './adminAccounts'

export const rankingSettings: RankingSettings = {
  assessmentWeightPercent: 70,
  matchRequirement: 10,
}

/** rotra-admin.html S.config version 1: the agreed initial 70% / 30% and 10 matches. */
export const rankingPolicyVersion1: RankingPolicyVersion = {
  version: 1,
  assessmentWeightBp: 7000,
  performanceWeightBp: 3000,
  recentStandardMatchThreshold: 10,
  effectiveAt: '2026-01-05T09:00:00+08:00',
  createdByEmail: adminAccount.email,
}

/** Every saved version, oldest first. */
export const rankingPolicyVersions: RankingPolicyVersion[] = [rankingPolicyVersion1]
