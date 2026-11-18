import { PLAYER_GOOGLE_SIGN_IN_FLAG } from '../feature-flag/featureFlag.keys'
import type { FeatureFlag } from '../feature-flag/featureFlag.types'
import { adminAccount } from './adminAccounts'

/**
 * The catalog starts with the flags ROTRA's own features ship with, all off (D-2026-11-18-01); the
 * platform owner adds any other flag. A shipped flag has no adder, so `createdByEmail` is empty.
 */
export const featureFlags: FeatureFlag[] = [
  {
    key: PLAYER_GOOGLE_SIGN_IN_FLAG,
    name: 'Google sign-in for players',
    description:
      'Players sign in and register with Continue with Google. While off, the Player app uses email and password as before.',
    on: false,
    revision: 1,
    createdAt: '2026-11-18T09:00:00+08:00',
    createdByEmail: '',
  },
]

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
