import { RANKING_THRESHOLD_MAX } from '@rotra/schema/ranking-settings'
import { adminMutation } from '../admin-account/mutation'
import { adminAccount } from '../fixtures/adminAccounts'
import { consumeMockDevToggle, requireOnline } from '../mock/bridge'
import { isProductionBuild } from '../mock/env'
import { ConflictError, MockError } from '../mock/errors'
import { delay } from '../mock/latency'
import { mockStore, readMockState } from '../mock/store'
import {
  BASIS_POINTS_TOTAL,
  effectiveRankingVersion,
  nextRankingPolicyVersion,
  percentToBasisPoints,
  rankingSettingsOf,
  validateRankingDraft,
} from './rankingSettings.rules'
import type {
  RankingPolicy,
  RankingPolicyVersion,
  RankingSettings,
  SaveRankingSettingsInput,
} from './rankingSettings.types'

/** rotra-admin.html cfgErr after a failed save; the screen shows "Couldn't save." in bold. */
export const rankingSettingsSaveError = (effectiveVersion: number) =>
  `Couldn't save. Version ${effectiveVersion} is still in effect. Your draft is kept, so you can try again.`

/** Same words as ConfigConflictNotice's title. */
export const rankingSettingsConflictError = (effectiveVersion: number) =>
  `Version ${effectiveVersion} was saved by someone else while you were editing.`

/** The effective version in the shape Player Information, Queue and Admin players read. */
export async function getRankingSettings(signal?: AbortSignal): Promise<RankingSettings> {
  await delay(200, signal)
  requireOnline()
  return rankingSettingsOf(effectiveRankingVersion(readMockState().rankingPolicyVersions))
}

/**
 * A-RANK-CONFIG: the version in effect and every saved version, oldest first. Read-only, no online
 * check (same as listAdminClubs). Swap this implementation for the real transport when the database
 * epic lands.
 */
export async function getRankingPolicy(signal?: AbortSignal): Promise<RankingPolicy> {
  await delay(400, signal)
  const versions = readMockState().rankingPolicyVersions
  return { effective: effectiveRankingVersion(versions), versions }
}

/**
 * D-CONFIG › Save configuration. Appends version + 1 (never edits an older one), effective now, only
 * when `baseVersion` is still the version in effect; otherwise rejects with a ConflictError carrying
 * the version in effect, so a stale draft never silently overwrites a newer save. Saving only appends
 * a version: no stored rank changes (whether existing ranks are recalculated is an open decision).
 * Offline → MockError('offline', ADMIN_OFFLINE_ERROR); invalid values → MockError('permission') with
 * fieldErrors keyed like RankingDraftErrors.
 */
export async function saveRankingSettings({
  draft,
  baseVersion,
}: SaveRankingSettingsInput): Promise<RankingPolicyVersion> {
  const errors = validateRankingDraft(draft)
  const firstError = Object.values(errors)[0]
  if (firstError) throw new MockError('permission', firstError, errors)
  const outcome = await adminMutation(1000, (state) => {
    const effective = effectiveRankingVersion(state.rankingPolicyVersions)
    // Dev toggle (prototype conflictConfig): another browser saves the same weights with the
    // requirement + 2 (− 2 at the 40 cap) four minutes earlier. That version is kept; this save meets it.
    if (!isProductionBuild() && consumeMockDevToggle('adminRankingSettingsSavedElsewhere')) {
      const threshold = effective.recentStandardMatchThreshold
      const other = nextRankingPolicyVersion(
        effective,
        {
          assessmentWeightBp: effective.assessmentWeightBp,
          performanceWeightBp: effective.performanceWeightBp,
          recentStandardMatchThreshold:
            threshold + 2 <= RANKING_THRESHOLD_MAX ? threshold + 2 : threshold - 2,
        },
        { createdByEmail: `${adminAccount.email} (another browser)`, at: Date.now() - 4 * 60_000 },
      )
      state.rankingPolicyVersions.push(other)
      return { saved: false as const, effective: other }
    }
    // Dev toggle (prototype failConfig): thrown inside the update, so the version in effect is unchanged.
    if (!isProductionBuild() && consumeMockDevToggle('adminNextRankingSettingsSaveFails'))
      throw new MockError('retryable', rankingSettingsSaveError(effective.version))
    if (baseVersion !== effective.version)
      throw new ConflictError(
        structuredClone(effective),
        rankingSettingsConflictError(effective.version),
      )
    const version = nextRankingPolicyVersion(effective, draft, {
      createdByEmail: adminAccount.email,
      at: Date.now(),
    })
    state.rankingPolicyVersions.push(version)
    return { saved: true as const, version: structuredClone(version) }
  })
  if (!outcome.saved)
    throw new ConflictError(
      outcome.effective,
      rankingSettingsConflictError(outcome.effective.version),
    )
  return outcome.version
}

/**
 * Development-only configuration edit, mirroring the prototype's Admin settings controls. Appends a
 * version like an Admin save (never edits an old one); an unchanged value appends nothing.
 */
export async function setRankingSettings(settings: RankingSettings): Promise<RankingSettings> {
  const assessmentWeightBp = percentToBasisPoints(settings.assessmentWeightPercent)
  const draft = {
    assessmentWeightBp,
    performanceWeightBp: BASIS_POINTS_TOTAL - assessmentWeightBp,
    recentStandardMatchThreshold: settings.matchRequirement,
  }
  if (
    !Number.isInteger(settings.assessmentWeightPercent) ||
    Object.keys(validateRankingDraft(draft)).length
  )
    throw new Error('Invalid ranking settings')
  mockStore.update((state) => {
    const effective = effectiveRankingVersion(state.rankingPolicyVersions)
    if (
      effective.assessmentWeightBp === draft.assessmentWeightBp &&
      effective.recentStandardMatchThreshold === draft.recentStandardMatchThreshold
    )
      return
    state.rankingPolicyVersions.push(
      nextRankingPolicyVersion(effective, draft, {
        createdByEmail: adminAccount.email,
        at: Date.now(),
      }),
    )
  })
  return settings
}
