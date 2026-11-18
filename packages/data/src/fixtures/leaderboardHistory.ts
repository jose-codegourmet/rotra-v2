import { leaderboardHistoryFacts } from '../leaderboard/history'
import { type LeaderboardFact, leaderboardStandings } from '../leaderboard/leaderboard.rules'
import type { MockState } from '../mock/store'
import { genSessions, PLAYER_FIXTURE_NOW } from './playerGames'
import { JOSE_PLAYER_ID, leaderboardLevels, leaderboardPlayers } from './players'

/** Previous-year results use the same game history shape as the profile and the current standings. */
export function seedLeaderboardHistory(state: MockState) {
  const current = leaderboardStandings(
    'year',
    PLAYER_FIXTURE_NOW.getTime(),
    leaderboardPlayers,
    leaderboardHistoryFacts(state.playerGames),
  )
  const [leader, runnerUp] = current
  for (const player of leaderboardPlayers) {
    const history = state.playerGames[player.id]
    // The fifth player is New on the annual board.
    if (!history || player.id === current[4]?.id) continue
    const previousYear = history.map((session) => {
      const played = new Date(session.finishedAt)
      played.setUTCFullYear(played.getUTCFullYear() - 1)
      return {
        ...session,
        id: `previous-year-${session.id}`,
        finishedAt: played.toISOString(),
        games: session.games.map((game) => ({ ...game, id: `previous-year-${game.id}` })),
      }
    })
    // Last year's winner is this year's runner-up. Third and fourth held their places.
    if (leader && runnerUp && player.id === runnerUp.id) {
      const session = previousYear[0]
      const game = session?.games.find((entry) => entry.counting === 'counted')
      if (session && game) {
        const extraWins = leader.wins - runnerUp.wins + 1
        for (let i = 0; i < extraWins; i++)
          session.games.push({ ...game, id: `previous-win-${i}`, result: 'won', score: null })
      }
    }
    history.push(...previousYear)
  }
  // The prototype's two unclaimed rows (rotra-player.html UNCLAIMED_SEED, positions 18 and 23): two
  // existing leaderboard players, each saved by exactly one club with their email and not
  // registered (D-2026-11-16-04). Their profile stays public for visitors. No row is added. The
  // 23rd pool player is a registered demo account, so the 17th stands in for the second row. The
  // existing multi-club Alex Reyes also has real fixture games and stays off the list.
  const unclaimedRows = [
    { player: leaderboardPlayers[17], club: state.clubs[1], key: 'tricia', daysAgo: 96 },
    { player: leaderboardPlayers[16], club: state.clubs[4], key: 'second', daysAgo: 71 },
  ]
  for (const { player, club, key, daysAgo } of unclaimedRows) {
    if (!player || !club) continue
    state.clubPlayers.push({
      id: `leaderboard-${key}-membership`,
      clubId: club.id,
      playerId: player.id,
      fullName: player.fullName,
      nickname: player.nickname,
      identity: 'unclaimed',
      playingLevel: leaderboardLevels[player.id] ?? null,
      addedAt: PLAYER_FIXTURE_NOW.getTime() - daysAgo * 86_400_000,
      joinedVia: 'added',
    })
    if (state.playerAccounts.some((account) => account.playerId === player.id)) continue
    state.playerAccounts.push({
      playerId: player.id,
      phone: '',
      email: `${player.fullName.toLowerCase().replace(/[^a-z]+/g, '.')}@example.com`,
      phoneHidden: false,
      claimed: false,
    })
  }
  state.playerGames['admin-demo-0'] = genSessions('admin-demo-0', 16)
}

/** Prototype controls change games, so the normal ordering and cutoff rules still decide the place. */
export function myPlaceFixture(playerIds: readonly string[], below: boolean): LeaderboardFact[] {
  const others = playerIds.filter((id) => id !== JOSE_PLAYER_ID)
  return [JOSE_PLAYER_ID, ...others].flatMap((id, index) => {
    // Sixteen people have two wins in the inside fixture. The demo player wins their sole match.
    // In the outside fixture everyone has one win, and the demo player has one more loss.
    const won = [true]
    if (below || id !== JOSE_PLAYER_ID) won.push(!below && index <= 16)
    if (below && id === JOSE_PLAYER_ID) won.push(false)
    return won.map((result) => ({
      playerId: id,
      playedAt: PLAYER_FIXTURE_NOW.getTime(),
      standardMatch: true,
      fullParticipation: true,
      valid: true,
      won: result,
    }))
  })
}
