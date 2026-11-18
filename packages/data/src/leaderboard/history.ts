import type { PlayerSessionRecord } from '../player/player.types'
import type { LeaderboardFact } from './leaderboard.rules'

/** Mock Player history contains only valid matches from valid finished sessions. */
export function leaderboardHistoryFacts(
  histories: Record<string, PlayerSessionRecord[]>,
): LeaderboardFact[] {
  const facts: LeaderboardFact[] = []
  for (const [playerId, sessions] of Object.entries(histories)) {
    for (const session of sessions) {
      const playedAt = Date.parse(session.finishedAt)
      for (const game of session.games) {
        facts.push({
          playerId,
          playedAt,
          standardMatch:
            game.counting !== 'fun' && (game.format === 'singles' || game.format === 'doubles'),
          fullParticipation: game.counting !== 'partial',
          valid: true,
          won: game.result === 'won',
        })
      }
    }
  }
  return facts
}
