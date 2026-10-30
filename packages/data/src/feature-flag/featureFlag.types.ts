/**
 * A platform feature flag (feature_flags): a platform-wide on/off switch the platform owner adds in
 * Admin. The key is what the apps' code checks, so it is fixed once the flag is created. There is no
 * targeting, schedule or audience; the description says what the flag does.
 */
export type FeatureFlag = {
  /** `^[a-z][a-z0-9_]{2,39}$`, unique, never changes */
  key: string
  /** Unique, up to 50 characters */
  name: string
  /** What changes for people when it's on */
  description: string
  on: boolean
  revision: number
  /** ISO time with the Manila offset of the last value change; absent when it never changed */
  changedAt?: string
}
