import { completeLineup, countedGames, isPartial } from '../match/match.rules'
import type { MockState } from '../mock/store'
import type { PlayerSessionRecord } from '../player/player.types'
import { createPlayerCompareFixtures } from './fixtures'
import type {
  PlayerCompareFilter,
  PlayerCompareStats,
  SharedGamePlayer,
  SharedPlayerGame,
} from './playerCompare.types'

export const PLAYER_COMPARE_PAGE_SIZE = 3

const winRate = (wins: number, games: number) =>
  games === 0 ? null : Math.round((wins / games) * 100)

/** Same public counted-game win rate the prototype shows, without calculating rank. */
export function overallCompareWinRate(sessions: PlayerSessionRecord[]) {
  const games = sessions
    .flatMap((session) => session.games)
    .filter(
      (game) =>
        game.counting === 'counted' && (game.format === 'singles' || game.format === 'doubles'),
    )
  return winRate(games.filter((game) => game.result === 'won').length, games.length)
}

export function compareStats(games: SharedPlayerGame[]): PlayerCompareStats {
  const myWins = games.filter((game) => game.meWon).length
  const otherWins = games.filter((game) => (game.together ? game.meWon : !game.meWon)).length
  return {
    games: games.length,
    myWins,
    otherWins,
    myWinRate: winRate(myWins, games.length),
    otherWinRate: winRate(otherWins, games.length),
  }
}

/** Read final rows only; never infer player linkage from names in profile-history fixtures. */
export function sharedPlayerGames(state: MockState, viewerId: string, otherId: string) {
  const fixture = createPlayerCompareFixtures(state)
  const sessions = new Map([...state.sessions, ...fixture.sessions].map((row) => [row.id, row]))
  const roster = new Map([...state.roster, ...fixture.roster].map((row) => [row.id, row]))
  const clubPlayers = new Map(
    [...state.clubPlayers, ...fixture.clubPlayers].map((row) => [row.id, row]),
  )
  const profiles = new Map(state.playerProfiles.map((row) => [row.playerId, row]))
  const clubs = new Map(state.clubs.map((row) => [row.id, row]))
  const matches = [...state.matches, ...fixture.matches]
  const result: SharedPlayerGame[] = []
  for (const match of matches) {
    const session = sessions.get(match.sessionId)
    const decision = match.decision
    if (
      !session ||
      session.state !== 'completed' ||
      session.finalizedAt == null ||
      match.state !== 'completed' ||
      decision?.kind !== 'completed' ||
      !decision.winningTeam ||
      (match.format !== 'singles' && match.format !== 'doubles') ||
      !completeLineup(match)
    )
      continue
    const participants = [...match.teamA, ...match.teamB].map((id) => roster.get(id))
    if (participants.some((row) => !row || row.sessionId !== session.id)) continue
    const globalId = (id: string) => {
      const row = roster.get(id)
      return row ? clubPlayers.get(row.clubPlayerId)?.playerId : undefined
    }
    const viewer = participants.find((row) => row && globalId(row.id) === viewerId)
    const other = participants.find((row) => row && globalId(row.id) === otherId)
    // A substitution credit is session-only: neither incoming nor outgoing gets long-term credit.
    if (!viewer || !other || isPartial(match, viewer.id) || isPartial(match, other.id)) continue
    const viewerIsA = match.teamA.includes(viewer.id)
    const myIds = viewerIsA ? match.teamA : match.teamB
    const theirIds = viewerIsA ? match.teamB : match.teamA
    const sessionMatches = matches.filter((row) => row.sessionId === session.id)
    const player = (id: string): SharedGamePlayer => {
      const row = roster.get(id)
      if (!row) throw new Error('Missing final match participant.')
      const playerId = globalId(id) ?? null
      const profile = playerId ? profiles.get(playerId) : undefined
      return {
        id,
        playerId,
        name: profile?.nickname || profile?.fullName || row.nicknameSnapshot || row.nameSnapshot,
        pictureUrl: profile?.picture ?? null,
        level: row.level,
        games: countedGames(id, sessionMatches),
      }
    }
    const scoreA = viewerIsA ? decision.teamAScore : decision.teamBScore
    const scoreB = viewerIsA ? decision.teamBScore : decision.teamAScore
    const club = clubs.get(session.clubId)
    if (!club) continue
    result.push({
      id: match.id,
      format: match.format,
      mine: myIds.map(player),
      theirs: theirIds.map(player),
      meWon: decision.winningTeam === (viewerIsA ? 'A' : 'B'),
      together: myIds.includes(other.id),
      score: scoreA == null || scoreB == null ? null : `${scoreA}–${scoreB}`,
      finishedAt: new Date(match.endedAt ?? decision.confirmedAt).toISOString(),
      sessionId: session.id,
      sessionTitle: session.title,
      clubId: club.id,
      clubName: club.name,
    })
  }
  return result.sort(
    (a, b) => Date.parse(b.finishedAt) - Date.parse(a.finishedAt) || a.id.localeCompare(b.id),
  )
}

export function compareGroups(games: SharedPlayerGame[]) {
  return {
    all: games,
    h2h: games.filter((game) => !game.together),
    together: games.filter((game) => game.together),
  } satisfies Record<PlayerCompareFilter, SharedPlayerGame[]>
}
