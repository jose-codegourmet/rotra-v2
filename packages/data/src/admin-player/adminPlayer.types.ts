/**
 * Where a player stands on the overall ROTRA leaderboard, as the Admin Players list shows it
 * (rotra-admin.html rankOf()): no rank yet, ranked but below the recent-match requirement, or on the
 * leaderboard. Computed upstream from the ranking configuration in effect (A03.5).
 */
export type PlayerRankStatus = { kind: 'none' | 'below' | 'board' }

/** One name shared by more than one player identity in the current Players results. */
export type SameNameGroup = { name: string; count: number }
