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

export const LEADERBOARD_PERIODS = ['year', 'month', 'week'] as const
export type LeaderboardPeriod = (typeof LEADERBOARD_PERIODS)[number]
export const LEADERBOARD_LIMIT = 50

export type LeaderboardPlace = { period: LeaderboardPeriod; position: number; wins: number }
export type LeaderboardRow = Omit<LeaderboardEntry, 'playingLevel'> & {
  playingLevel: PlayingLevel | null
  position: number
  wins: number
  losses: number
  /** Null means New. Older responses may have no comparison. */
  previousPosition?: number | null
  masked?: boolean
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
