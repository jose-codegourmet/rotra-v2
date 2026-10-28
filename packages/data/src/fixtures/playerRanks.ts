import { leaderboardEntries } from './leaderboardPlayers'
import { genSessions, MIGS_SESSIONS, PLAYER_FIXTURE_NOW } from './playerGames'
import { players } from './players'
import { countRecentStandardMatches } from '../player/player.rules'
import { PLAYING_LEVELS, type PlayerRank, type PlayerSessionRecord } from '../player/player.types'

export const MIGS_PLAYER_ID = '2c7f6a7b-eed9-5051-9426-6dbce5133fbc'
function hash(value: string) {
  let result = 2166136261
  for (const character of value) result = Math.imul(result ^ character.charCodeAt(0), 16777619)
  return result >>> 0
}
/** Prototype BASE recent counts use the original lb index, before inserting Migs at #128. */
export function createPlayerRankFixtures() {
  const games: Record<string, PlayerSessionRecord[]> = {}
  const ranks: Record<string, PlayerRank> = {}
  const entries = new Map(leaderboardEntries.map((entry, index) => [entry.id, { entry, index }]))
  for (const player of players) {
    const item = entries.get(player.id)
    const baseIndex = item ? item.index - (item.index > 127 ? 1 : 0) : 0
    const count = item ? 10 + ((hash(`lb${baseIndex}`) >>> 4) % 16) : 7
    // Keep the prototype's bN/u2 seeds so generated opponents, scores and session dates match.
    const historySeed = item ? `b${baseIndex}` : player.rtrId === 'RTR-PH-CEB-040226-0007' ? 'u2' : player.id
    const sessions = player.id === MIGS_PLAYER_ID ? MIGS_SESSIONS : genSessions(historySeed, count)
    games[player.id] = sessions
    ranks[player.id] = {
      playerId: player.id, fullName: player.fullName, nickname: player.nickname,
      levelIndex: item ? PLAYING_LEVELS.indexOf(item.entry.playingLevel) : player.rtrId === 'RTR-PH-CEB-040226-0007' ? 3 : 5,
      state: item ? 'established' : 'provisional', updatePending: null, position: null,
      recentCount: countRecentStandardMatches(sessions, PLAYER_FIXTURE_NOW), olderCount: 0,
    }
  }
  return { playerRanks: ranks, playerGames: games }
}
