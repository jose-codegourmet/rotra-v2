import type { LeaderboardEntry } from '../leaderboard/leaderboard.types'
import type { PlayingLevel } from '../player/player.types'
import portraits from './playerPortraits.json'
import { leaderboardPlayers } from './players'

// The Player prototype's exact population, from Advanced High down to Beginner Low.
const pictures: Record<string, string> = portraits
const COUNTS_TOP = [9, 22, 40, 104, 196, 272, 250, 262, 129] as const

function levelAt(position: number): PlayingLevel {
  let count = 0
  for (let offset = 0; offset < COUNTS_TOP.length; offset += 1) {
    count += COUNTS_TOP[offset] ?? 0
    if (position <= count)
      return `${['advanced', 'intermediate', 'beginner'][Math.floor(offset / 3)]}_${['high', 'mid', 'low'][offset % 3]}` as PlayingLevel
  }
  return 'beginner_low'
}

/**
 * Deterministic leaderboard entries ordered by global position. Foundation's generated player
 * snapshot is the single source for shared identities, including Migs at position 128.
 */
export const leaderboardEntries: LeaderboardEntry[] = leaderboardPlayers.map((player, index) => ({
  id: player.id,
  fullName: player.fullName,
  nickname: player.nickname,
  playingLevel: levelAt(index + 1),
  pictureUrl: pictures[player.id] ?? null,
}))
