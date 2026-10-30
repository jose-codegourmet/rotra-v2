import { adminMutation } from '../admin-account/mutation'
import { appendAdminAudit } from '../admin-audit/fetchers'
import { adminAccount } from '../fixtures/adminAccounts'
import { placeholderFeatureFlag } from '../fixtures/featureFlags'
import { isProductionBuild } from '../mock/env'
import { ConflictError, MockError } from '../mock/errors'
import { delay } from '../mock/latency'
import { mockStore, readMockState } from '../mock/store'
import { manilaIsoString } from '../ranking-settings/rankingSettings.rules'
import {
  addFeatureFlagErrors,
  featureFlagAddedSummary,
  featureFlagConflictError,
  featureFlagSwitchedSummary,
  newFeatureFlag,
  switchedFeatureFlag,
  trimFeatureFlagInput,
  withPlaceholderFlag,
} from './featureFlag.rules'
import type {
  AddFeatureFlagInput,
  FeatureFlag,
  SetFeatureFlagValueInput,
} from './featureFlag.types'

/**
 * A-FEATURE-FLAGS: every flag, in list order (oldest added first; the dev placeholder on top).
 * Read-only, no online check (same as listAdminClubs). Swap this implementation for the real
 * transport when the database epic lands.
 */
export async function listFeatureFlags(signal?: AbortSignal): Promise<FeatureFlag[]> {
  await delay(400, signal)
  return readMockState().featureFlags
}

/**
 * A-ADD-FLAG › Add flag. Rechecks every field and, at commit, that the name (ignoring case and
 * accents) and the key are still free: another save may have taken them since the form checked.
 * Format errors reject with MockError('permission'), a taken name or key with MockError('conflict');
 * both carry fieldErrors keyed like the form. Offline → MockError('offline', ADMIN_OFFLINE_ERROR).
 * The key is stored as given and no fetcher ever changes it.
 */
export function addFeatureFlag(input: AddFeatureFlagInput): Promise<FeatureFlag> {
  const values = trimFeatureFlagInput(input)
  return adminMutation(800, (draft) => {
    const formatErrors = addFeatureFlagErrors(values, [])
    const firstFormatError = Object.values(formatErrors)[0]
    if (firstFormatError) throw new MockError('permission', firstFormatError, formatErrors)
    const takenErrors = addFeatureFlagErrors(values, draft.featureFlags)
    const firstTakenError = Object.values(takenErrors)[0]
    if (firstTakenError) throw new MockError('conflict', firstTakenError, takenErrors)
    const flag = newFeatureFlag(values, {
      email: adminAccount.email,
      at: manilaIsoString(Date.now()),
    })
    draft.featureFlags.push(flag)
    appendAdminAudit(draft, {
      action: 'feature_flag_created',
      targetType: 'feature_flag',
      targetId: flag.key,
      summary: featureFlagAddedSummary(flag),
    })
    return structuredClone(flag)
  })
}

/**
 * D-FLAG › Turn on / Turn off. Saves the new value only when `revision` is still the flag's
 * revision; otherwise rejects with a ConflictError carrying the flag as it is now, so a stale
 * confirmation never silently overwrites a newer change. The same value as now changes nothing.
 * Offline → MockError('offline', ADMIN_OFFLINE_ERROR); the accepted value stays as it was.
 */
export function setFeatureFlagValue({
  key,
  on,
  revision,
}: SetFeatureFlagValueInput): Promise<FeatureFlag> {
  return adminMutation(800, (draft) => {
    const index = draft.featureFlags.findIndex((flag) => flag.key === key)
    const current = draft.featureFlags[index]
    if (!current) throw new MockError('permission', 'This flag is not available.')
    if (current.revision !== revision)
      throw new ConflictError(structuredClone(current), featureFlagConflictError(current))
    if (current.on === on) return structuredClone(current)
    const flag = switchedFeatureFlag(current, on, {
      email: adminAccount.email,
      at: manilaIsoString(Date.now()),
    })
    draft.featureFlags[index] = flag
    appendAdminAudit(draft, {
      action: 'feature_flag_value_changed',
      targetType: 'feature_flag',
      targetId: key,
      summary: featureFlagSwitchedSummary(flag),
    })
    return structuredClone(flag)
  })
}

/** Dev toggle 'Show a placeholder flag': whether the placeholder is in the list. */
export function isPlaceholderFeatureFlagShown(): boolean {
  return mockStore
    .getSnapshot()
    .featureFlags.some((flag) => flag.key === placeholderFeatureFlag.key)
}

/**
 * Development-only (rotra-admin.html demoFlag): adds the placeholder flag at the top of the list, or
 * removes it. No audit line: it isn't an Admin action. Mounted queries re-read through the store.
 */
export function setPlaceholderFeatureFlagShown(shown: boolean) {
  if (isProductionBuild()) return
  mockStore.update((draft) => {
    draft.featureFlags = withPlaceholderFlag(draft.featureFlags, placeholderFeatureFlag, shown)
  })
}
