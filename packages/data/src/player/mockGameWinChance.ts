import { sampleForm } from '../match/winChance.rules'
import type { MockState } from '../mock/store'
import type { GameWinChanceFace } from './gameWinChance.rules'
import { sessionWeekday } from './player.rules'
import type { PlayerSessionRecord } from './player.types'

/**
 * Mock mode: the win chance inputs of a face in one session's games (D-2026-11-27-03). The mock
 * keeps no level per session and no long club history, so the club's current level for the player
 * stands in and the lasting signals are the Queue's sample ones (`sampleForm`), read on the
 * session's weekday. A guest or a face with no ROTRA profile (`playerId` null) has no record: a
 * mid level and no form. Every mock read of a game court uses this, so the numbers agree.
 */
export function mockGameWinChanceFaces(
  state: MockState,
  session: Pick<PlayerSessionRecord, 'clubName' | 'finishedAt'>,
) {
  const clubId = state.clubs.find((club) => club.name === session.clubName)?.id
  const weekday = sessionWeekday(session.finishedAt)
  return (playerId: string | null | undefined): GameWinChanceFace => {
    if (!playerId) return { level: null }
    const level =
      state.clubPlayers.find((p) => p.clubId === clubId && p.playerId === playerId && !p.removedAt)
        ?.playingLevel ?? null
    return { level, form: sampleForm(playerId, weekday) }
  }
}
