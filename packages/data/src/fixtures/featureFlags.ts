import type { FeatureFlag } from '../feature-flag/featureFlag.types'

/** The feature flag catalog starts empty: the platform owner adds every flag (no invented flags). */
export const featureFlags: FeatureFlag[] = []

/**
 * Dev-only: shows how a defined flag looks in Admin (stories, dev toggles). Never part of
 * featureFlags.
 */
export const placeholderFeatureFlag: FeatureFlag = {
  key: 'placeholder',
  name: 'Placeholder flag',
  description:
    'Shows how a defined flag will look in Admin. It is not a real flag and controls nothing.',
  on: false,
  revision: 1,
}
