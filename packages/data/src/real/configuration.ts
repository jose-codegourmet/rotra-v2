import { featureFlagConflictError } from '../feature-flag/featureFlag.rules'
import type {
  AddFeatureFlagInput,
  FeatureFlag,
  SetFeatureFlagValueInput,
} from '../feature-flag/featureFlag.types'
import { ConflictError, MockError, NotConnectedError } from '../mock/errors'
import {
  effectiveRankingVersion,
  manilaIsoString,
  rankingSettingsOf,
} from '../ranking-settings/rankingSettings.rules'
import type {
  RankingPolicy,
  RankingPolicyVersion,
  RankingSettings,
  SaveRankingSettingsInput,
} from '../ranking-settings/rankingSettings.types'
import { RealRequestError, realRequest } from './client'

/** Admin's `/api/feature-flags` row (`@rotra/db/admin/configuration`). */
type WireFlag = {
  key: string
  name: string
  description: string
  value: boolean
  createdAt: string
  createdByDisplayName: string
  updatedAt: string
  updatedByDisplayName: string
  revision: string
}

/** Admin's `/api/ranking-settings` version. */
type WirePolicy = {
  version: number
  effectiveAt: string
  assessmentWeightBp: number
  performanceWeightBp: number
  recentStandardMatchThreshold: number
  changeNote: string
  createdByDisplayName: string
}

const manila = (iso: string) => manilaIsoString(Date.parse(iso))

/**
 * Admin accounts store a display name, not an email; it fills the `…ByEmail` fields (as license
 * terms do). Adding a flag counts as its first change, so `changedAt` is always set.
 */
function flagOf(wire: WireFlag): FeatureFlag {
  return {
    key: wire.key,
    name: wire.name,
    description: wire.description,
    on: wire.value,
    revision: Number(wire.revision),
    createdAt: manila(wire.createdAt),
    createdByEmail: wire.createdByDisplayName,
    changedAt: manila(wire.updatedAt),
    changedByEmail: wire.updatedByDisplayName,
  }
}

function policyOf(wire: WirePolicy): RankingPolicyVersion {
  return {
    version: wire.version,
    assessmentWeightBp: wire.assessmentWeightBp,
    performanceWeightBp: wire.performanceWeightBp,
    recentStandardMatchThreshold: wire.recentStandardMatchThreshold,
    effectiveAt: manila(wire.effectiveAt),
    createdByEmail: wire.createdByDisplayName,
    ...(wire.changeNote ? { changeNote: wire.changeNote } : {}),
  }
}

export async function realListFeatureFlags(signal?: AbortSignal): Promise<FeatureFlag[]> {
  const { flags } = await realRequest<{ flags: WireFlag[] }>('/api/feature-flags', { signal })
  return flags.map(flagOf)
}

/**
 * A-ADD-FLAG › Add flag. One command ID per call: a lost reply is a 'timeout' (check the list before
 * adding again), and a retry of a saved key meets "That key is already used.", never a second flag.
 */
export async function realAddFeatureFlag(input: AddFeatureFlagInput): Promise<FeatureFlag> {
  const { flag } = await realRequest<{ flag: WireFlag }>('/api/feature-flags', {
    method: 'POST',
    body: {
      commandId: crypto.randomUUID(),
      key: input.key,
      name: input.name,
      description: input.description,
      on: input.on,
    },
  })
  return flagOf(flag)
}

/** D-FLAG: a stale revision comes back as a ConflictError carrying the flag as it is now. */
export async function realSetFeatureFlagValue({
  key,
  on,
  revision,
}: SetFeatureFlagValueInput): Promise<FeatureFlag> {
  try {
    const { flag } = await realRequest<{ flag: WireFlag }>(
      `/api/feature-flags/${encodeURIComponent(key)}`,
      { method: 'PATCH', body: { on, expectedRevision: String(revision) } },
    )
    return flagOf(flag)
  } catch (error) {
    if (error instanceof RealRequestError && error.status === 404)
      throw new MockError('permission', 'This flag is not available.')
    if (!(error instanceof RealRequestError) || error.status !== 409) throw error
    const current = (await realListFeatureFlags()).find((flag) => flag.key === key)
    if (!current) throw new MockError('permission', 'This flag is not available.')
    throw new ConflictError(current, featureFlagConflictError(current))
  }
}

async function versions(signal?: AbortSignal) {
  const { versions } = await realRequest<{ versions: WirePolicy[] }>('/api/ranking-settings', {
    signal,
  })
  return versions.map(policyOf)
}

export async function realGetRankingPolicy(signal?: AbortSignal): Promise<RankingPolicy> {
  const all = await versions(signal)
  return { effective: effectiveRankingVersion(all), versions: all }
}

/**
 * The version in effect in the reader shape. Only Admin serves `/api/ranking-settings`; elsewhere
 * (Player Information's public pages) the route does not exist, so the read is not connected yet
 * rather than a refusal.
 */
export async function realGetRankingSettings(signal?: AbortSignal): Promise<RankingSettings> {
  try {
    return rankingSettingsOf(effectiveRankingVersion(await versions(signal)))
  } catch (error) {
    if (error instanceof RealRequestError && error.status === 404) throw new NotConnectedError()
    throw error
  }
}

/**
 * D-CONFIG › Save configuration under `baseVersion`. A newer version meets a ConflictError carrying
 * the version in effect; a failed save keeps the draft with the screen's "Couldn't save." copy.
 */
export async function realSaveRankingSettings(
  { draft, baseVersion }: SaveRankingSettingsInput,
  messages: { saveError: (v: number) => string; conflictError: (v: number) => string },
): Promise<RankingPolicyVersion> {
  try {
    const { version } = await realRequest<{ version: WirePolicy }>('/api/ranking-settings', {
      method: 'POST',
      body: {
        commandId: crypto.randomUUID(),
        expectedVersion: baseVersion,
        assessmentWeightBp: draft.assessmentWeightBp,
        performanceWeightBp: draft.performanceWeightBp,
        recentStandardMatchThreshold: draft.recentStandardMatchThreshold,
        changeNote: draft.changeNote ?? '',
      },
    })
    return policyOf(version)
  } catch (error) {
    if (!(error instanceof RealRequestError)) throw error
    if (error.status === 409) {
      const { effective } = await realGetRankingPolicy()
      throw new ConflictError(effective, messages.conflictError(effective.version))
    }
    if (error.kind === 'retryable')
      throw new MockError('retryable', messages.saveError(baseVersion))
    throw error
  }
}
