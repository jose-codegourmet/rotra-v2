import { PLAYER_FIXTURE_NOW } from '../fixtures/playerGames'
import { MockError } from '../mock/errors'
import { delay } from '../mock/latency'
import { readMockState } from '../mock/store'
import { yearGameStats } from '../player/player.rules'
import { playerProjection } from '../player/projection'
import type { ParticipantStats } from '../public-session/publicSession.types'
import { isRealDataMode } from '../real/mode'

/**
 * Stats · YEAR on the Queue Master's player profile dialog (2026-11-13-queue-profile-stats-banner):
 * the linked ROTRA player's official games this calendar year (Asia/Manila), the same numbers as the
 * session page's participant card. Guests and unclaimed records have no ROTRA history yet: null
 * (“No games yet this year”). Real mode has no Queue-side read yet, so it rejects and the card says
 * the stats couldn't load.
 */
export async function getClubPlayerYearStats(
  clubPlayerId: string,
  signal?: AbortSignal,
): Promise<ParticipantStats | null> {
  if (isRealDataMode())
    throw new MockError('retryable', "Couldn't load these stats. Try again later.")
  await delay(150, signal)
  const player = readMockState().clubPlayers.find((p) => p.id === clubPlayerId)
  if (!player?.playerId || player.identity !== 'registered') return null
  // Mock histories are dated from the fixture clock, like rank and the participant card.
  return yearGameStats(playerProjection().games[player.playerId] ?? [], PLAYER_FIXTURE_NOW)
}
