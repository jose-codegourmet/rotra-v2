import { JOSE_PLAYER_ID, leaderboardPlayers } from '../fixtures/players'
import type { Match } from '../match/match.types'
import type { MockState } from '../mock/store'
import { PLAYING_LEVELS } from '../player/player.types'
import type { SessionPlayer } from '../session-roster/sessionRoster.types'

/** The prototype's demonstrative 8 / 6 / 2 pair, represented by explicit final match rows. */
export const COMPARE_FIXTURE_OTHER_ID = leaderboardPlayers[0]?.id

export type CompareRows = Pick<MockState, 'sessions' | 'matches' | 'roster' | 'clubPlayers'>

/**
 * Isolated Player Information history fixtures. These never mutate Queue history or rank fixtures.
 * Every match has a valid singles/doubles lineup and explicit identity links, including partners.
 */
export function createPlayerCompareFixtures(state: MockState): CompareRows {
  const base = state.sessions.find((session) => session.state === 'completed')
  const otherId = COMPARE_FIXTURE_OTHER_ID
  const partners = state.clubPlayers.filter(
    (player) => player.playerId && ![JOSE_PLAYER_ID, otherId].includes(player.playerId),
  )
  const first = partners[0]?.playerId
  const second = partners[1]?.playerId
  if (!base || !otherId || !first || !second)
    return { sessions: [], matches: [], roster: [], clubPlayers: [] }

  const ids = [JOSE_PLAYER_ID, otherId, first, second]
  const clubPlayers = ids.map((playerId, i) => {
    const profile = state.playerProfiles.find((player) => player.playerId === playerId)
    if (!profile) throw new Error('Missing compare profile fixture.')
    const levelIndex = state.playerRanks[playerId]?.levelIndex
    return {
      id: `compare-club-player-${i}`,
      playerId,
      clubId: base.clubId,
      fullName: profile.fullName,
      nickname: profile.nickname,
      identity: 'registered' as const,
      playingLevel: levelIndex == null ? null : (PLAYING_LEVELS[levelIndex] ?? null),
    }
  })
  const rows: CompareRows = { sessions: [], matches: [], roster: [], clubPlayers }
  for (let i = 0; i < 8; i++) {
    const sessionId = `compare-session-${i}`
    const finishedAt = (base.finalizedAt ?? base.scheduledEndAt) - (i + 1) * 86400000
    rows.sessions.push({
      ...base,
      id: sessionId,
      title: i % 2 === 0 ? 'Sunday Night Queue' : 'Thursday Open Play',
      state: 'completed',
      scheduledStartAt: finishedAt - 3 * 3600000,
      scheduledEndAt: finishedAt,
      startedAt: finishedAt - 3 * 3600000,
      finalizedAt: finishedAt,
      playerRecordsUpdatedAt: finishedAt,
      publicSlug: sessionId,
    })
    const roster: SessionPlayer[] = clubPlayers.map((player, index) => ({
      id: `${sessionId}-player-${index}`,
      sessionId,
      clubPlayerId: player.id,
      nameSnapshot: player.fullName,
      nicknameSnapshot: player.nickname,
      present: true,
      presentChangedAt: null,
      level: player.playingLevel,
      levelLockedAt: finishedAt - 3 * 3600000,
      confirmedAt: finishedAt - 4 * 3600000,
    }))
    rows.roster.push(...roster)
    const rosterId = (index: number) => `${sessionId}-player-${index}`
    const together = i >= 6
    const singles = i === 1 || i === 4
    const won = [0, 2, 3, 6].includes(i)
    const match: Match = {
      id: `${sessionId}-match`,
      sessionId,
      matchNo: 1,
      state: 'completed',
      format: singles ? 'singles' : 'doubles',
      queuePosition: 1,
      origin: 'manual',
      manualProtected: false,
      teamA: together
        ? [rosterId(0), rosterId(1)]
        : singles
          ? [rosterId(0)]
          : [rosterId(0), rosterId(2)],
      teamB: together
        ? [rosterId(2), rosterId(3)]
        : singles
          ? [rosterId(1)]
          : [rosterId(1), rosterId(3)],
      courtIds: [],
      startedAt: finishedAt - 20 * 60000,
      endedAt: finishedAt - 60000,
      substitutions: [],
      decision: {
        kind: 'completed',
        winningTeam: won ? 'A' : 'B',
        teamAScore: won ? 21 : 16,
        teamBScore: won ? 16 : 21,
        confirmedAt: finishedAt - 60000,
      },
    }
    rows.matches.push(match)
  }
  return rows
}
