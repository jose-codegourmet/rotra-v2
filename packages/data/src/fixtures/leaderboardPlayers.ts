import type { LeaderboardEntry } from '../leaderboard/leaderboard.types'
import portraits from './playerPortraits.json'
import { leaderboardLevels, leaderboardPlayers } from './players'

const pictures: Record<string, string> = portraits

/** Deterministic leaderboard entries ordered by global position, from Advanced down to Beginner. */
export const leaderboardEntries: LeaderboardEntry[] = leaderboardPlayers.map((player) => ({
  id: player.id,
  fullName: player.fullName,
  nickname: player.nickname,
  playingLevel: leaderboardLevels[player.id] ?? 'beginner_low',
  pictureUrl: pictures[player.id] ?? null,
}))
