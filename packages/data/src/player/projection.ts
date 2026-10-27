import { leaderboardEntries } from '../fixtures/leaderboardPlayers'
import { MIGS_PLAYER_ID } from '../fixtures/playerRanks'
import { PLAYER_FIXTURE_NOW } from '../fixtures/playerGames'
import { getMockDevState } from '../mock/bridge'
import { readMockState } from '../mock/store'
import { countRecentStandardMatches, orderLeaderboard } from './player.rules'

/** Public fixture projection; applies only the already-approved mock eligibility rules. */
export function playerProjection() {
  const store = readMockState()
  const scenario = getMockDevState().playerRankScenario
  let sessions = store.playerGames[MIGS_PLAYER_ID] ?? []
  if (scenario === 'below-threshold') sessions = sessions.slice(0, 2)
  if (scenario === 'no-rank') sessions = sessions.slice(0, 1).map((s) => ({ ...s, games: s.games.filter((g) => g.format !== 'singles') }))
  if (scenario === 'needs-reassessment') sessions = sessions.map((s) => ({ ...s, finishedAt: new Date(Date.parse(s.finishedAt) - 100 * 86400000).toISOString(), sessionPageUrl: null }))
  store.playerGames[MIGS_PLAYER_ID] = sessions
  const migs = store.playerRanks[MIGS_PLAYER_ID]
  if (migs) {
    migs.recentCount = countRecentStandardMatches(sessions, PLAYER_FIXTURE_NOW)
    migs.olderCount = sessions.flatMap((s) => s.games).filter((g) => g.counting === 'counted').length - migs.recentCount
    migs.state = scenario === 'needs-reassessment' ? 'needs_reassessment' : scenario === 'below-threshold' || scenario === 'no-rank' ? 'provisional' : 'established'
    if (scenario === 'no-rank') migs.levelIndex = null
    if (scenario === 'updating') {
      const latest = sessions[0]
      if (latest) migs.updatePending = { sessionTitle: latest.title, clubName: latest.clubName, finishedAt: latest.finishedAt }
    }
  }
  const candidates = leaderboardEntries.flatMap((entry) => {
    const rank = store.playerRanks[entry.id]
    return rank ? [{ ...entry, ...rank }] : []
  })
  const entries = getMockDevState().leaderboardScenario === 'empty' ? [] : orderLeaderboard(candidates, store.rankingSettings.matchRequirement).map((entry, index) => ({ ...entry, position: index + 1 }))
  for (const entry of entries) {
    const rank = store.playerRanks[entry.id]
    if (rank) rank.position = entry.position
  }
  return { ranks: store.playerRanks, games: store.playerGames, players: store.players, entries }
}
