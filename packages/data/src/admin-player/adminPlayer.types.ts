/**
 * Admin-only player domain (A-PLAYERS, A-PLAYER-DETAIL). It carries private contacts and the
 * privileged phone/email search, so it is kept apart from the public `player` domain: nothing in
 * `player/` may import it, and apps/player and apps/queue never read it.
 */

/**
 * Where a player stands on the overall ROTRA leaderboard, as the Admin Players list shows it
 * (rotra-admin.html rankOf()): no rank yet, ranked but below the recent-match requirement, or on the
 * leaderboard. Computed upstream from the ranking configuration in effect (A03.5).
 */
export type PlayerRankStatus = { kind: 'none' | 'below' | 'board' }

/** A rank status with its read-only line, e.g. 'Intermediate Low · 9 of 10 recent matches'. */
export type RankStatus = PlayerRankStatus & { text: string }

/** One name shared by more than one player identity in the current Players results. */
export type SameNameGroup = { name: string; count: number }

/**
 * One player identity as Admin sees it. Fields the mock data does not hold stay null/undefined rather
 * than being invented: `createdByClubId` is the club whose saved roster first lists the player (null
 * when no club record exists) and `registeredOn` is not recorded yet.
 */
export type AdminPlayer = {
  id: string
  name: string
  /** The public nickname, else the first nickname a club saved for the player */
  nickname: string | null
  /**
   * The permanent RTR ID; null for a club's unclaimed record, which has none until the person
   * registers (D-2026-11-11-03). Such a row's `id` is the club player id.
   */
  rtrId: string | null
  createdByClubId: string | null
  /** 'YYYY-MM-DD', from the RTR ID date segment (MMDDYY) */
  createdOn: string
  /** E.164; private, Admin only */
  phone?: string
  /** Private, Admin only */
  email?: string
  claimed: boolean
  /** 'YYYY-MM-DD' */
  registeredOn?: string
  phoneHidden: boolean
  /** Index into PLAYING_LEVELS; null = no rank yet */
  levelIndex: number | null
  picture: string | null
  levelBand: 'beginner' | 'intermediate' | 'advanced' | null
  addedOn: string
  registeredPlace: { code: string; name: string }
  clubs: {
    clubId: string
    name: string
    addedAt: number | null
    identity: import('../club-player/clubPlayer.types').ClubPlayer['identity']
  }[]
  archivedAt: string | null
  revision: number
  removalReason: string | null
  recentStandardMatches: number
  rankStatus: RankStatus
}

export type AdminPlayerAccountFilter = 'all' | 'registered' | 'unclaimed'

export type AdminPlayerListParams = {
  q?: string
  account?: AdminPlayerAccountFilter
  /** Rows to return; the screen asks for 25 more each time */
  limit?: number
  level?: 'beginner' | 'intermediate' | 'advanced' | 'none'
  duplicates?: boolean
  addedFrom?: string
  addedTo?: string
  place?: string[]
  archived?: 'active' | 'archived' | 'all'
  page?: number
  pageSize?: number
}

export type AdminPlayerList = {
  rows: AdminPlayer[]
  page: number
  pageSize: number
  pageCount: number
  start: number
  end: number
  stats: AdminPlayerStats
  matchingIds: string[]
  duplicateGroups: { ids: string[]; reasons: string[] }[]
  places: { code: string; name: string }[]
  /** Matches for the search and filter, before the limit */
  total: number
  /** Whole directory, independent of the search */
  counts: Record<AdminPlayerAccountFilter, number>
  /** Names shared by more than one matching identity */
  duplicateNames: SameNameGroup[]
}

/** A-PLAYER-DETAIL: the player plus every other identity with exactly the same name. */
export type AdminPlayerDetail = AdminPlayer & {
  samePlayers: Pick<AdminPlayer, 'id' | 'name' | 'rtrId'>[]
}

export type AdminPlayerStats = {
  advanced: number
  intermediate: number
  beginner: number
  noRank: number
  registered: number
  unclaimed: number
}
export type AdminPlayerRecord = {
  archivedAt: string | null
  revision: number
  createdByClubId: string | null
  adminCreated: boolean
  /**
   * Password *(for MVP or beta only)*: only that Admin set one, by whom and when (ISO). The
   * password itself is never stored. Beta only, end date not set — D-2026-11-09-14.
   */
  passwordSetAt?: string | null
  /** The signed-in Admin's email */
  passwordSetBy?: string | null
}

/**
 * A-PLAYER-EDIT: what the Edit form loads. The directory row plus every editable profile field from
 * the player's profile and account, the previous picture and the beta-only password marker.
 * Playing since is not stored: it is derived from the experience (ExperienceFields).
 */
export type AdminPlayerEdit = AdminPlayer & {
  playingStyle: string
  experienceYears: number | null
  experienceMonths: number | null
  socialLinks: { facebook: string; instagram: string; youtube: string; linkedin: string }
  profilePrivate: boolean
  /** The picture before the current one (photo or character), offered as Use previous picture; null = none */
  previousPicture: string | null
  /** Whether the player has a contact record (phone, email, sign-in). Without one, contacts stay empty. */
  hasAccount: boolean
  /** "Last set by Admin <time>"; null = Admin never set it. Never the password. */
  passwordSetAt: string | null
}

/** The changed-field words, in the order the Activity log and toast list them (rotra-admin.html pmSave() LABEL). */
export type AdminPlayerChangedField =
  | 'profile picture'
  | 'name'
  | 'nickname'
  | 'playing style'
  | 'experience'
  | 'private profile'
  | 'phone privacy'
  | 'phone'
  | 'email'
  | 'Facebook link'
  | 'Instagram link'
  | 'YouTube link'
  | 'LinkedIn link'
  | 'password'

/** Save changes: the form values plus the record and revision it was loaded under. */
export type AdminPlayerEditInput = import('@rotra/schema/admin-player').AdminPlayerEditValues & {
  id: string
  revision: number
}

/** Save changes' answer. Never carries the password. `message` is the toast. */
export type AdminPlayerEditResult = {
  player: AdminPlayer
  /** Empty = "Nothing changed." (nothing saved, no Activity log entry, no revision bump) */
  changed: AdminPlayerChangedField[]
  passwordSet: boolean
  /** 'Nothing changed.' or 'Saved <name>: <fields>.' (+ ' Give the new password to the player yourself.') */
  message: string
}
export type AdminPlayerBulkResult = { id: string; name: string; success: boolean; error?: string }
