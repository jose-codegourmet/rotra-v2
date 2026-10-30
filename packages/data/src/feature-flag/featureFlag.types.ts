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
  /** Starts at 1; every value change adds 1. A switch based on an older revision is refused. */
  revision: number
  /** ISO time with the Manila offset when the flag was added */
  createdAt: string
  /** Email of the Admin who added it */
  createdByEmail: string
  /**
   * ISO time with the Manila offset of the last value change; absent when it never changed. Adding a
   * flag counts as its first change (rotra-admin.html flagCreate sets `changed`).
   */
  changedAt?: string
  /** Email of the Admin who made the last change; absent when it never changed */
  changedByEmail?: string
}

/** A-ADD-FLAG › Add flag: what AddFlagForm submits. The key can't be changed after this. */
export type AddFeatureFlagInput = {
  name: string
  key: string
  description: string
  /** 'Turn on right away'; off by default */
  on: boolean
}

/** D-FLAG › Turn on / Turn off: the new value and the revision the confirmation was opened on. */
export type SetFeatureFlagValueInput = {
  key: string
  on: boolean
  revision: number
}

/** Field messages keyed like AddFeatureFlagInput. */
export type AddFeatureFlagErrors = Partial<Record<'name' | 'key' | 'description', string>>
