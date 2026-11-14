import { getSession } from '../auth/fetchers'
import { PLAYER_FIXTURE_NOW } from '../fixtures/playerGames'
import { MockError } from '../mock/errors'
import { readMockState } from '../mock/store'
import { profileCharacterImage } from '../profile-character/fetchers'
import { maskPublicName } from '../public-session/publicSession.rules'
import { isRealDataMode } from '../real/mode'
import { realGetMyShareSession } from '../real/my-sessions'
import { getPlayerGames, getPlayerProfile, getPlayerRank } from './fetchers'
import { countYearCountedWins } from './player.rules'
import type { PlayerShareGame, PlayerShareParticipant } from './player.types'
import { isPrivatePlayer } from './visibility'

const SAMPLE_SESSION_POSITIONS: Record<string, number> = { m2: 3, m3: 7, m4: 5, m5: 12 }

/** Cards carry no identifying picture for private players or guests. */
function shareParticipant(name: string): PlayerShareParticipant {
  const player = readMockState().playerProfiles.find(
    (p) => p.fullName === name || p.nickname === name,
  )
  if (!player || isPrivatePlayer(player.playerId))
    return { name: maskPublicName(name), picture: null }
  return { name, picture: profileCharacterImage(player.picture) ?? player.picture }
}
export async function getPlayerShareData(
  playerId: string,
  sessionId?: string,
  signal?: AbortSignal,
) {
  if ((await getSession('player'))?.account.id !== playerId)
    throw new MockError('permission', 'Sign in to share your results.')
  const [profile, rank, history] = await Promise.all([
    getPlayerProfile(playerId, signal),
    getPlayerRank(playerId, signal),
    getPlayerGames(playerId, signal),
  ])
  if (!profile) return null
  const link = `/players/${encodeURIComponent(playerId)}`
  if (!sessionId)
    return rank?.levelIndex != null ? { kind: 'rank' as const, profile, rank, link } : null
  const session = history.find((s) => s.id === sessionId)
  if (!session) return null
  // Totals for Share performance: every game played; Won and Lost count singles and doubles only.
  const counted = session.games.filter((g) => g.counting === 'counted')
  const countedWins = counted.filter((g) => g.result === 'won').length
  const totals = {
    totalGames: session.games.length,
    countedWins,
    countedLosses: counted.length - countedWins,
  }
  if (isRealDataMode()) {
    const saved = await realGetMyShareSession(sessionId, signal)
    // Own games are shareable before the club publishes (D-2026-11-13-06): the server returns the
    // people on the player's own games either way (masked as on public pages); only the position
    // waits for the standings. A game the server has no people for falls back to masked names.
    const real = (name: string, from?: PlayerShareParticipant): PlayerShareParticipant =>
      from
        ? { name: from.name, picture: profileCharacterImage(from.picture) ?? from.picture }
        : { name: maskPublicName(name), picture: null }
    const games: PlayerShareGame[] = session.games
      .filter((game) => game.counting !== 'partial')
      .map((game) => {
        const people = saved.games[game.id]
        const partnerPlayers = game.partners.map((n, i) => real(n, people?.partners[i])),
          opponentPlayers = game.opponents.map((n, i) => real(n, people?.opponents[i]))
        return {
          ...game,
          partners: partnerPlayers.map((p) => p.name),
          opponents: opponentPlayers.map((p) => p.name),
          partnerPlayers,
          opponentPlayers,
        }
      })
    const wins = games.filter((g) => g.result === 'won').length
    return {
      kind: 'session' as const,
      profile,
      session: { ...session, games },
      published: saved.published,
      position: saved.published ? saved.position : null,
      wins,
      losses: games.length - wins,
      ...totals,
      link,
    }
  }
  const publication = readMockState().publications[sessionId]
  const published = !!publication?.publishedSlides.includes('standings')
  const games: PlayerShareGame[] = session.games
    .filter((game) => game.counting !== 'partial')
    .map((game) => {
      const partnerPlayers = game.partners.map(shareParticipant),
        opponentPlayers = game.opponents.map(shareParticipant)
      return {
        ...game,
        partners: partnerPlayers.map((p) => p.name),
        opponents: opponentPlayers.map((p) => p.name),
        partnerPlayers,
        opponentPlayers,
      }
    })
  const wins = games.filter((g) => g.result === 'won').length
  const snapshot = readMockState().resultSnapshots[sessionId]
  const clubIds = new Set(
    readMockState()
      .clubPlayers.filter((p) => p.playerId === playerId)
      .map((p) => p.id),
  )
  const position = published
    ? (snapshot?.standings.find((s) => clubIds.has(s.clubPlayerId))?.position ??
      SAMPLE_SESSION_POSITIONS[sessionId] ??
      null)
    : null
  return {
    kind: 'session' as const,
    profile,
    session: { ...session, games },
    published,
    position,
    wins,
    losses: games.length - wins,
    ...totals,
    link,
  }
}

/**
 * The Share profile card: the own profile, or any profile the viewer may see (the profile card's
 * Share profile, 2026-11-13-profile-card-open-share). A private profile is refused by the profile
 * read itself. Always available, even with no level, position or games.
 */
export async function getPlayerProfileShareData(playerId: string, signal?: AbortSignal) {
  const [profile, rank, history] = await Promise.all([
    getPlayerProfile(playerId, signal),
    getPlayerRank(playerId, signal),
    getPlayerGames(playerId, signal),
  ])
  if (!profile) return null
  const now = isRealDataMode() ? Date.now() : PLAYER_FIXTURE_NOW.getTime()
  const recent = countYearCountedWins(history, now)
  return {
    kind: 'profile' as const,
    profile,
    levelIndex: rank?.levelIndex ?? null,
    position: rank?.position ?? null,
    wins: recent.games > 0 ? recent.wins : null,
    link: `/players/${encodeURIComponent(playerId)}`,
  }
}
