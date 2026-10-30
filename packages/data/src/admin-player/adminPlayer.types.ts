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
  rtrId: string
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
  recentStandardMatches: number
  rankStatus: RankStatus
}

export type AdminPlayerAccountFilter = 'all' | 'registered' | 'unclaimed'

export type AdminPlayerListParams = {
  q?: string
  account?: AdminPlayerAccountFilter
  /** Rows to return; the screen asks for 25 more each time */
  limit?: number
}

export type AdminPlayerList = {
  rows: AdminPlayer[]
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
