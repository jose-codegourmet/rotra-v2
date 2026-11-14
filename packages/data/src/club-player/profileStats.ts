import { PLAYER_FIXTURE_NOW } from '../fixtures/playerGames'
import { delay } from '../mock/latency'
import { readMockState } from '../mock/store'
import { yearGameStats } from '../player/player.rules'
import { playerProjection } from '../player/projection'
import type { ParticipantStats } from '../public-session/publicSession.types'
import { isRealDataMode } from '../real/mode'
import { realGetClubPlayerYearStats } from '../real/queue'

/**
 * Stats · YEAR on the Queue Master's player profile dialog (2026-11-13-queue-profile-stats-banner):
 * the linked ROTRA player's official games this calendar year (Asia/Manila), the same numbers as the
 * session page's participant card. Guests and unclaimed records have no ROTRA history yet: null
 * (“No games yet this year”). Real mode reads the same numbers from the Queue app's
 * `/api/club/players/<id>/year-stats` (#821).
 */
export async function getClubPlayerYearStats(
  clubPlayerId: string,
  signal?: AbortSignal,
): Promise<ParticipantStats | null> {
  if (isRealDataMode()) return realGetClubPlayerYearStats(clubPlayerId, signal)
  await delay(150, signal)
  const player = readMockState().clubPlayers.find((p) => p.id === clubPlayerId)
  if (!player?.playerId || player.identity !== 'registered') return null
  // Mock histories are dated from the fixture clock, like rank and the participant card.
  return yearGameStats(playerProjection().games[player.playerId] ?? [], PLAYER_FIXTURE_NOW)
}
