import { myPlaceFixture } from '../fixtures/leaderboardHistory'
import { PLAYER_FIXTURE_NOW } from '../fixtures/playerGames'
import { getMockDevState } from '../mock/bridge'
import type { MockState } from '../mock/store'
import { PLAYING_LEVELS } from '../player/player.types'
import { resolveMockProfileBanner } from '../profile-banner/fetchers'
import { leaderboardHistoryFacts } from './history'
import { unclaimedClubCount } from './identity'
import {
  type LeaderboardFact,
  type LeaderboardScope,
  leaderboardPeriodStart,
  leaderboardStandings,
  leaderboardTop,
} from './leaderboard.rules'
import {
  LEADERBOARD_PERIODS,
  type LeaderboardPeriod,
  type LeaderboardPlace,
  type LeaderboardRow,
} from './leaderboard.types'

/**
 * Read the fixture clock once per projection, just as real mode reads the request's clock once.
 * `scope.clubId` gives that club's leaderboard: the same rules over its own sessions' games.
 */
export function mockLeaderboard(
  state: MockState,
  scenario = getMockDevState().leaderboardScenario,
) {
  const now = PLAYER_FIXTURE_NOW.getTime()
  const candidates = state.playerProfiles
    .filter((profile) => !state.adminPlayerRecords[profile.playerId]?.archivedAt)
    .map((profile) => ({
      id: profile.playerId,
      fullName: profile.fullName,
      nickname: profile.nickname,
      unclaimedClubCount: unclaimedClubCount(state, profile.playerId),
    }))
  const facts: LeaderboardFact[] = []
  const clubIds = new Map(state.clubs.map((club) => [club.name, club.id]))
  const weekStart = leaderboardPeriodStart('week', now)
  if (scenario === 'in-top-50' || scenario === 'below-top-50') {
    const ids = candidates
      .filter((p) => state.playerGames[p.id]?.length && (p.unclaimedClubCount ?? 1) === 1)
      .map((p) => p.id)
    facts.push(...myPlaceFixture(ids, scenario === 'below-top-50'))
  } else if (scenario !== 'empty') {
    for (const fact of leaderboardHistoryFacts(state.playerGames, clubIds)) {
      if (scenario !== 'empty-week' || Number(fact.playedAt) < weekStart) facts.push(fact)
    }
  }
  const standings = (period: LeaderboardPeriod, scope?: LeaderboardScope) =>
    leaderboardStandings(period, now, candidates, facts, scope)
  /** Profiles name ROTRA places only, never club places. */
  const places = (playerId: string): LeaderboardPlace[] =>
    LEADERBOARD_PERIODS.flatMap((period) => {
      const row = leaderboardTop(standings(period)).find((entry) => entry.id === playerId)
      return row ? [{ period, position: row.position, wins: row.wins }] : []
    })
  /** Full names, nicknames and pictures for everyone (D-2026-11-25-04); `masked` only gates the tap. */
  const entries = (
    period: LeaderboardPeriod,
    viewerId: string | null,
    scope?: LeaderboardScope,
  ): LeaderboardRow[] =>
    leaderboardTop(standings(period, scope)).flatMap((row) => {
      const profile = state.playerProfiles.find((p) => p.playerId === row.id)
      if (!profile) return []
      const unclaimed = candidates.find((p) => p.id === row.id)?.unclaimedClubCount === 1
      const alwaysPrivate =
        !unclaimed && profile.profileVisibility === 'always_private' && viewerId !== row.id
      const masked =
        alwaysPrivate || (!unclaimed && !viewerId && profile.profileVisibility === 'private')
      const levelIndex = state.playerRanks[row.id]?.levelIndex
      return [
        {
          ...row,
          fullName: profile.fullName,
          nickname: profile.nickname,
          playingLevel:
            alwaysPrivate || levelIndex == null ? null : (PLAYING_LEVELS[levelIndex] ?? null),
          pictureUrl: profile.picture,
          ...resolveMockProfileBanner(profile.bannerId, state.profileBanners),
          masked,
          levelHidden: alwaysPrivate,
          unclaimed,
        },
      ]
    })
  return { now, standings, places, entries }
}
