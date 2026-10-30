import { plainIdentity } from '../club/club.rules'
import type { AddFeatureFlagErrors, AddFeatureFlagInput, FeatureFlag } from './featureFlag.types'

export const FEATURE_FLAG_NAME_MAX = 50
export const FEATURE_FLAG_DESCRIPTION_MIN = 10
/** 3 to 40 lowercase letters, numbers and underscores, starting with a letter (feature_flags key). */
export const FEATURE_FLAG_KEY_PATTERN = /^[a-z][a-z0-9_]{2,39}$/

/** Same words as AddFlagForm's schema (rotra-admin.html flagErrors). */
export const FEATURE_FLAG_NAME_TAKEN = 'A flag with this name already exists.'
export const FEATURE_FLAG_KEY_TAKEN = 'That key is already used.'

/** Shown when a switch was confirmed on an older revision of the flag. Copy awaiting confirmation. */
export const featureFlagConflictError = (flag: FeatureFlag) =>
  `${flag.name} was changed while you were deciding. It's ${flag.on ? 'on' : 'off'} now. Check it and try again.`

/** Input with surrounding spaces removed, as it is stored. */
export function trimFeatureFlagInput(input: AddFeatureFlagInput): AddFeatureFlagInput {
  return {
    name: input.name.trim(),
    key: input.key.trim(),
    description: input.description.trim(),
    on: input.on,
  }
}

/**
 * The server-side recheck of A-ADD-FLAG (rotra-admin.html flagErrors): format first, then uniqueness
 * against `existing`. Names match ignoring case and accents; keys match exactly. Expects trimmed input.
 */
export function addFeatureFlagErrors(
  input: AddFeatureFlagInput,
  existing: readonly Pick<FeatureFlag, 'name' | 'key'>[],
): AddFeatureFlagErrors {
  const errors: AddFeatureFlagErrors = {}
  if (!input.name) errors.name = 'Enter a name.'
  else if (input.name.length > FEATURE_FLAG_NAME_MAX)
    errors.name = 'Keep the name under 50 characters.'
  else if (existing.some((flag) => plainIdentity(flag.name) === plainIdentity(input.name)))
    errors.name = FEATURE_FLAG_NAME_TAKEN
  if (!input.key) errors.key = 'Enter a key.'
  else if (!FEATURE_FLAG_KEY_PATTERN.test(input.key))
    errors.key = 'Use 3 to 40 lowercase letters, numbers and underscores, starting with a letter.'
  else if (existing.some((flag) => flag.key === input.key)) errors.key = FEATURE_FLAG_KEY_TAKEN
  if (input.description.length < FEATURE_FLAG_DESCRIPTION_MIN)
    errors.description = 'Describe what the flag does, so it is clear when to use it.'
  return errors
}

/** A new flag at revision 1. Adding counts as its first change, as in the prototype. */
export function newFeatureFlag(
  input: AddFeatureFlagInput,
  by: { email: string; at: string },
): FeatureFlag {
  return {
    key: input.key,
    name: input.name,
    description: input.description,
    on: input.on,
    revision: 1,
    createdAt: by.at,
    createdByEmail: by.email,
    changedAt: by.at,
    changedByEmail: by.email,
  }
}

/** The flag with its new value: the next revision and this change's time and Admin. Key unchanged. */
export function switchedFeatureFlag(
  flag: FeatureFlag,
  on: boolean,
  by: { email: string; at: string },
): FeatureFlag {
  return { ...flag, on, revision: flag.revision + 1, changedAt: by.at, changedByEmail: by.email }
}

/** Record of actions line for Add flag (rotra-admin.html flagCreate). */
export const featureFlagAddedSummary = (flag: Pick<FeatureFlag, 'key' | 'on'>) =>
  `Added feature flag ${flag.key} (${flag.on ? 'on' : 'off'}).`

/** Record of actions line for a value switch. */
export const featureFlagSwitchedSummary = (flag: Pick<FeatureFlag, 'key' | 'on'>) =>
  `Turned ${flag.on ? 'on' : 'off'} feature flag ${flag.key}.`

/**
 * Dev toggle 'Show a placeholder flag' (rotra-admin.html demoFlag): adds `placeholder` at the top of
 * the list, or removes the flag with its key when it is there.
 */
export function withPlaceholderFlag(
  flags: readonly FeatureFlag[],
  placeholder: FeatureFlag,
  shown: boolean,
): FeatureFlag[] {
  const rest = flags.filter((flag) => flag.key !== placeholder.key)
  return shown ? [placeholder, ...rest] : rest
}
