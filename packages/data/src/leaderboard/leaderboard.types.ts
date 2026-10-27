import type { PlayingLevel } from '../player/player.types'

/** Public leaderboard data. Contacts and account credentials never belong in this type. */
export type LeaderboardEntry = {
  id: string
  fullName: string
  nickname: string | null
  playingLevel: PlayingLevel
  pictureUrl: string | null
}
