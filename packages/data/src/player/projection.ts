import { leaderboardEntries } from '../fixtures/leaderboardPlayers'
import { PLAYER_FIXTURE_NOW } from '../fixtures/playerGames'
import { JOSE_PLAYER_ID } from '../fixtures/players'
import { getMockDevState } from '../mock/bridge'
import { readMockState } from '../mock/store'
import { countRecentStandardMatches, orderLeaderboard } from './player.rules'

/** Public fixture projection; applies only the already-approved mock eligibility rules. */
export function playerProjection() {
  const store = readMockState()
  const scenario = getMockDevState().playerRankScenario
  let sessions = store.playerGames[JOSE_PLAYER_ID] ?? []
  if (scenario === 'below-threshold') sessions = sessions.slice(0, 2)
  if (scenario === 'no-rank')
    sessions = sessions
      .slice(0, 1)
      .map((s) => ({ ...s, games: s.games.filter((g) => g.format !== 'singles') }))
  if (scenario === 'needs-reassessment')
    sessions = sessions.map((s) => ({
      ...s,
      finishedAt: new Date(Date.parse(s.finishedAt) - 100 * 86400000).toISOString(),
      sessionPageUrl: null,
    }))
  store.playerGames[JOSE_PLAYER_ID] = sessions
  const jose = store.playerRanks[JOSE_PLAYER_ID]
  if (jose) {
    jose.recentCount = countRecentStandardMatches(sessions, PLAYER_FIXTURE_NOW)
    jose.olderCount =
      sessions.flatMap((s) => s.games).filter((g) => g.counting === 'counted').length -
      jose.recentCount
    jose.state =
      scenario === 'needs-reassessment'
        ? 'needs_reassessment'
        : scenario === 'below-threshold' || scenario === 'no-rank'
          ? 'provisional'
          : 'established'
    if (scenario === 'no-rank') jose.levelIndex = null
    if (scenario === 'updating') {
      const latest = sessions[0]
      if (latest)
        jose.updatePending = {
          sessionTitle: latest.title,
          clubName: latest.clubName,
          finishedAt: latest.finishedAt,
        }
    }
  }
  // A saved profile edit renames the player everywhere their public name appears.
  const names = new Map(
    store.playerProfiles.map((p) => [p.playerId, { fullName: p.fullName, nickname: p.nickname }]),
  )
  for (const [id, rank] of Object.entries(store.playerRanks)) {
    const name = names.get(id)
    if (name) Object.assign(rank, name)
  }
  const candidates = leaderboardEntries.flatMap((entry) => {
    const rank = store.playerRanks[entry.id]
    return rank ? [{ ...entry, ...rank, ...names.get(entry.id) }] : []
  })
  const entries =
    getMockDevState().leaderboardScenario === 'empty'
      ? []
      : orderLeaderboard(candidates, store.rankingSettings.matchRequirement).map(
          (entry, index) => ({ ...entry, position: index + 1 }),
        )
  for (const entry of entries) {
    const rank = store.playerRanks[entry.id]
    if (rank) rank.position = entry.position
  }
  return { ranks: store.playerRanks, games: store.playerGames, players: store.players, entries }
}
