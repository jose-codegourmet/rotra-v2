import { getSession } from '../auth/fetchers'
import { MockError } from '../mock/errors'
import { readMockState } from '../mock/store'
import { profileCharacterImage } from '../profile-character/fetchers'
import { maskPublicName } from '../public-session/publicSession.rules'
import { isRealDataMode } from '../real/mode'
import { realGetMyShareSession } from '../real/my-sessions'
import { getPlayerGames, getPlayerProfile, getPlayerRank } from './fetchers'
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
  if (isRealDataMode()) {
    const saved = await realGetMyShareSession(sessionId, signal)
    if (!saved.published)
      return { kind: 'not-shared' as const, message: 'Results not shared yet by the club.' }
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
      position: saved.position,
      wins,
      losses: games.length - wins,
      link,
    }
  }
  const publication = readMockState().publications[sessionId]
  if (!publication?.publishedSlides.includes('standings'))
    return { kind: 'not-shared' as const, message: 'Results not shared yet by the club.' }
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
  const position =
    snapshot?.standings.find((s) => clubIds.has(s.clubPlayerId))?.position ??
    SAMPLE_SESSION_POSITIONS[sessionId] ??
    null
  return {
    kind: 'session' as const,
    profile,
    session: { ...session, games },
    position,
    wins,
    losses: games.length - wins,
    link,
  }
}
