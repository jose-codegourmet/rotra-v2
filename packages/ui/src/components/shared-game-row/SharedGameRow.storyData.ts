import { leaderboardEntries } from '@rotra/data/fixtures/leaderboard-players'
import { genSessions, JOSE_SESSIONS, PLAYER_FIXTURE_NOW } from '@rotra/data/fixtures/player-games'
import { playerProfiles, playerProfileScenarios } from '@rotra/data/fixtures/player-profiles'
import { JOSE_PLAYER_ID, leaderboardLevels, players } from '@rotra/data/fixtures/players'
import { countRecentStandardMatches } from '@rotra/data/player/rules'
import type { PlayingLevel } from '@rotra/data/player/types'
import type { CompareStatRow } from '@rotra/ui/compare-stats'
import { levelLabel } from '@rotra/ui/level-pill'
import type { SharedGame, SharedGamePlayer } from './SharedGameRow'

const meProfile = playerProfiles.find((profile) => profile.playerId === JOSE_PLAYER_ID)
const otherProfile = playerProfiles.find((profile) => profile.fullName === 'Aaron')
if (!meProfile || !otherProfile) throw new Error('Missing Compare story identities.')

export const me = {
  name: meProfile.fullName,
  pictureUrl: meProfile.picture,
  level: 'intermediate_low' as PlayingLevel,
}
export const them = {
  name: otherProfile.fullName,
  pictureUrl: otherProfile.picture,
  level: leaderboardLevels[otherProfile.playerId] ?? null,
}
export const longName = { ...them, name: playerProfileScenarios.longNames.fullName }

// Adapt existing official history fixtures to the display props. No new game results are seeded.
export const sharedGames: SharedGame[] = JOSE_SESSIONS.flatMap((session) =>
  session.games
    .filter(
      (game) =>
        game.counting === 'counted' &&
        (game.partners.includes(them.name) || game.opponents.includes(them.name)),
    )
    .map((game) => {
      const participant = (name: string): SharedGamePlayer => {
        const identity = players.find((player) => player.fullName === name)
        const profile = playerProfiles.find((entry) => entry.playerId === identity?.id)
        return {
          id: identity?.id ?? name,
          name,
          label: name === me.name ? 'You' : (name.split(/\s+/)[0] ?? name),
          level:
            name === me.name
              ? me.level
              : identity
                ? (leaderboardLevels[identity.id] ?? null)
                : null,
          pictureUrl: profile?.picture,
          games: session.games.filter(
            (entry) =>
              name === me.name || entry.partners.includes(name) || entry.opponents.includes(name),
          ).length,
        }
      }
      return {
        id: game.id,
        mine: [participant(me.name), ...game.partners.map(participant)],
        theirs: game.opponents.map(participant),
        meWon: game.result === 'won',
        together: game.partners.includes(them.name),
        otherName: them.name,
        dateLabel: new Date(session.finishedAt).toLocaleDateString('en-PH', {
          month: 'short',
          day: 'numeric',
          timeZone: 'Asia/Manila',
        }),
        sessionTitle: session.title,
        clubName: session.clubName,
        score: game.score,
      }
    }),
)
export const togetherGames = sharedGames.filter((game) => game.together)
export const againstGames = sharedGames.filter((game) => !game.together)
export const counts = {
  all: sharedGames.length,
  h2h: againstGames.length,
  together: togetherGames.length,
}
export const won = togetherGames.filter((game) => game.meWon).length
export const winRate = Math.round((won / togetherGames.length) * 100)

const position = (id: string) => {
  const index = leaderboardEntries.findIndex((entry) => entry.id === id)
  return index < 0 ? '—' : `#${index + 1}`
}
const otherSessions = genSessions(otherProfile.playerId, JOSE_SESSIONS.length)
const counted = JOSE_SESSIONS.flatMap((session) => session.games).filter(
  (game) => game.counting === 'counted',
)
const otherCounted = otherSessions
  .flatMap((session) => session.games)
  .filter((game) => game.counting === 'counted')
const overallRows: CompareStatRow[] = [
  {
    label: 'Games counted (3 months)',
    mine: countRecentStandardMatches(JOSE_SESSIONS, PLAYER_FIXTURE_NOW),
    theirs: countRecentStandardMatches(otherSessions, PLAYER_FIXTURE_NOW),
  },
  {
    label: 'Win rate overall',
    mine: `${Math.round((counted.filter((game) => game.result === 'won').length / counted.length) * 100)}%`,
    theirs: `${Math.round((otherCounted.filter((game) => game.result === 'won').length / otherCounted.length) * 100)}%`,
  },
]
const levelRows: CompareStatRow[] = [
  { label: 'Level', mine: levelLabel(me.level), theirs: levelLabel(them.level) },
  {
    label: 'Overall position',
    mine: position(meProfile.playerId),
    theirs: position(otherProfile.playerId),
  },
]
export function comparisonRows(filter: 'all' | 'h2h'): CompareStatRow[] {
  const games = filter === 'all' ? sharedGames : againstGames
  const mine = games.filter((game) => game.meWon).length
  const theirs = games.filter((game) => (game.together ? game.meWon : !game.meWon)).length
  const lead = mine === theirs ? undefined : mine > theirs ? 'mine' : 'theirs'
  return [
    ...levelRows,
    ...(filter === 'h2h' ? overallRows : []),
    {
      label: filter === 'all' ? 'Shared games' : 'Games against each other',
      mine: games.length,
      theirs: games.length,
    },
    { label: 'Wins in these games', mine, theirs, lead },
    {
      label: 'Win rate in these games',
      mine: `${Math.round((mine / games.length) * 100)}%`,
      theirs: `${Math.round((theirs / games.length) * 100)}%`,
      lead,
    },
  ]
}
