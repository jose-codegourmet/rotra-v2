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
  const [leader] = current
  // Last year's winner is this year's sole 3rd place (else the runner-up). Places 1 to 3 then hold
  // the same players both years, so from 4th place on everyone holds their place.
  const third = current.filter((row) => row.position === 3)
  const climber = third.length === 1 ? third[0] : current[1]
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
    if (leader && climber && player.id === climber.id) {
      const session = previousYear[0]
      const game = session?.games.find((entry) => entry.counting === 'counted')
      if (session && game) {
        const extraWins = leader.wins - climber.wins + 1
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

/**
 * Prototype controls change games, so the normal ordering, shared places and cutoff rules still
 * decide the place. Inside: sixteen people hold sixteen different records above the demo player,
 * who wins their sole match (place 17); everyone else shares the next place, so the list also shows
 * the tie at the cut. Outside: fifty people hold fifty different places, the rest share the next
 * one with one win and one loss, and the demo player has one win and two losses.
 */
export function myPlaceFixture(playerIds: readonly string[], below: boolean): LeaderboardFact[] {
  const others = playerIds.filter((id) => id !== JOSE_PLAYER_ID)
  const distinct = below ? 49 : 16
  const record = (index: number) => {
    if (index === 0) return { wins: 1, losses: below ? 2 : 0 }
    if (index <= distinct) return { wins: 2 + Math.floor((index - 1) / 4), losses: (index - 1) % 4 }
    return { wins: 1, losses: below && index === distinct + 1 ? 0 : 1 }
  }
  return [JOSE_PLAYER_ID, ...others].flatMap((id, index) => {
    const { wins, losses } = record(index)
    return Array.from({ length: wins + losses }, (_, game) => ({
      playerId: id,
      playedAt: PLAYER_FIXTURE_NOW.getTime(),
      standardMatch: true,
      fullParticipation: true,
      valid: true,
      won: game < wins,
    }))
  })
}
