import type { PlayingLevel } from '../player/player.types'

/** Public leaderboard data. Contacts and account credentials never belong in this type. */
export type LeaderboardEntry = {
  id: string
  fullName: string
  nickname: string | null
  playingLevel: PlayingLevel
  pictureUrl: string | null
  /**
   * The resolved Profile banner: public, like the picture, so masked rows keep it; missing draws the
   * default.
   */
  bannerKey?: string | null
  bannerImageUrl?: string | null
}

/** Display and tab order: Top annual, Top quarterly, Top monthly, Top weekly (D-2026-11-25-04). */
export const LEADERBOARD_PERIODS = ['year', 'quarter', 'month', 'week'] as const
export type LeaderboardPeriod = (typeof LEADERBOARD_PERIODS)[number]
/** A list holds the first 50 players, plus anyone sharing the 50th player's place (`leaderboardTop`). */
export const LEADERBOARD_LIMIT = 50

export type LeaderboardPlace = { period: LeaderboardPeriod; position: number; wins: number }
/**
 * One leaderboard row (ROTRA or club). The full name, nickname and picture are never masked on a
 * leaderboard, whatever the profile visibility (D-2026-11-25-04).
 */
export type LeaderboardRow = Omit<LeaderboardEntry, 'playingLevel'> & {
  playingLevel: PlayingLevel | null
  /**
   * The place, without gaps: the same wins and the same win rate share one (1, 1, 2). Read the place
   * from here, never from an array index.
   */
  position: number
  wins: number
  losses: number
  /** Null means New. Older responses may have no comparison. */
  previousPosition?: number | null
  /**
   * The viewer may not open this player's profile as a full profile (a visitor on a Private profile,
   * or anyone else on an Always private one). Only decides what a tap opens: the row still shows the
   * full name, nickname and picture.
   */
  masked?: boolean
  /** Always private, seen by someone else: no level on the row. */
  levelHidden?: boolean
  unclaimed?: boolean
}
export type LeaderboardPage = { entries: LeaderboardRow[]; total: number; periodStart: string }
export type MyPeriodPosition = {
  /** Null when the viewer has played no qualifying matches in the period. */
  position: number | null
  wins: number
  losses: number
  previousPosition?: number | null
  cutoffWins?: number
  cutoffHasBetterWinRate?: boolean
}
