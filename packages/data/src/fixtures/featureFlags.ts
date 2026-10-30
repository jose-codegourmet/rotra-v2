import type { FeatureFlag } from '../feature-flag/featureFlag.types'
import { adminAccount } from './adminAccounts'

/** The feature flag catalog starts empty: the platform owner adds every flag (no invented flags). */
export const featureFlags: FeatureFlag[] = []

/**
 * Dev-only: shows how a defined flag looks in Admin (stories, the 'Show a placeholder flag' dev
 * toggle). Never part of featureFlags. Added at ADMIN_FIXTURE_NOW; never changed.
 */
export const placeholderFeatureFlag: FeatureFlag = {
  key: 'placeholder',
  name: 'Placeholder flag',
  description:
    'Shows how a defined flag will look in Admin. It is not a real flag and controls nothing.',
  on: false,
  revision: 1,
  createdAt: '2026-10-29T19:52:00+08:00',
  createdByEmail: adminAccount.email,
}
