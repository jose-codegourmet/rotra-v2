import type { PlayerSessionRecord } from '../player/player.types'
import type { LeaderboardFact } from './leaderboard.rules'

/**
 * Mock Player history contains only valid matches from valid finished sessions. The history names
 * its club, so `clubIds` (club name to ID) tags each fact for the club leaderboards; a club with no
 * fixture record counts only on the ROTRA leaderboard.
 */
export function leaderboardHistoryFacts(
  histories: Record<string, PlayerSessionRecord[]>,
  clubIds: ReadonlyMap<string, string> = new Map(),
): LeaderboardFact[] {
  const facts: LeaderboardFact[] = []
  for (const [playerId, sessions] of Object.entries(histories)) {
    for (const session of sessions) {
      const playedAt = Date.parse(session.finishedAt)
      const clubId = clubIds.get(session.clubName)
      for (const game of session.games) {
        facts.push({
          playerId,
          playedAt,
          standardMatch:
            game.counting !== 'fun' &&
            game.counting !== 'not_ranked' &&
            (game.format === 'singles' || game.format === 'doubles'),
          fullParticipation: game.counting !== 'partial',
          valid: true,
          won: game.result === 'won',
          ...(clubId ? { clubId } : {}),
        })
      }
    }
  }
  return facts
}
