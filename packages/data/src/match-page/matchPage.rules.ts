import type { MatchFormat } from '../match/match.types'
import type { PlayerGame, PlayerGamePlayer, ProfileVisibility } from '../player/player.types'
import { isNameMasked } from '../player/visibility.rules'
import { maskPublicName } from '../public-session/publicSession.rules'
import type { MatchPage, MatchSide } from './matchPage.types'

/**
 * Who a face on the match page is before the viewer's rules: a ROTRA profile with its visibility,
 * or a guest (no ROTRA profile).
 */
export type MatchFaceIdentity =
  | { kind: 'guest' }
  | { kind: 'player'; playerId: string; visibility: ProfileVisibility }

/**
 * What this viewer may see of one face (public match page rules, November 25, 2026), from the
 * profile rules (D-2026-11-12-01, `isNameMasked`): a Private player is masked for visitors who are
 * not signed in; an Always private player for everyone but themselves, with their level and games
 * hidden too. A masked player's games stay hidden, as the profile games read refuses them. A guest
 * is masked for visitors like a Private player ("Guests are treated the same way"); they have no
 * level here, and their games in the session still show. Pictures are never hidden by these rules.
 */
export function matchFaceAccess(identity: MatchFaceIdentity, viewerPlayerId: string | null) {
  if (identity.kind === 'guest')
    return { nameMasked: !viewerPlayerId, levelHidden: true, gamesHidden: false }
  const viewer = { signedIn: !!viewerPlayerId, isSelf: viewerPlayerId === identity.playerId }
  const nameMasked = isNameMasked(identity.visibility, viewer)
  return {
    nameMasked,
    levelHidden: identity.visibility === 'always_private' && !viewer.isSelf,
    gamesHidden: nameMasked,
  }
}

/** A face as the viewer sees it: the name masked per `matchFaceAccess`; a guest has no picture or id. */
export function projectMatchFace(
  face: { name: string; picture: string | null },
  identity: MatchFaceIdentity,
  viewerPlayerId: string | null,
): Required<Omit<PlayerGamePlayer, 'sessionGameNumber'>> {
  const { nameMasked } = matchFaceAccess(identity, viewerPlayerId)
  const name = nameMasked ? maskPublicName(face.name) : face.name
  if (identity.kind === 'guest') return { name, picture: null, playerId: null }
  return { name, picture: face.picture, playerId: identity.playerId }
}

/** Singles and doubles are standard; every fun format is not. */
export const isStandardFormat = (format: MatchFormat) =>
  format === 'singles' || format === 'doubles'

/** The match-level counting, as profile games set it for a full participation. */
export function matchCounting(standard: boolean, ranked: boolean): MatchPage['counting'] {
  if (!standard) return 'fun'
  return ranked ? 'counted' : 'not_ranked'
}

/** Every earlier game is played; only full games have a win or loss in this session record. */
export function beforeGameRecord(games: readonly Pick<PlayerGame, 'counting' | 'result'>[]) {
  let wins = 0
  let losses = 0
  for (const game of games) {
    if (game.counting === 'partial') continue
    if (game.result === 'won') wins += 1
    else losses += 1
  }
  const decided = wins + losses
  return {
    played: games.length,
    wins,
    losses,
    winRate: decided ? Math.round((wins / decided) * 100) : null,
  }
}

/** A score read from one side ("21–18"), as profile games show it; null without both scores. */
export function sideScore(
  teamAScore: number | null,
  teamBScore: number | null,
  side: MatchSide,
): string | null {
  if (teamAScore == null || teamBScore == null) return null
  return side === 'a' ? `${teamAScore}–${teamBScore}` : `${teamBScore}–${teamAScore}`
}

/** "21–18" read from the other side ("18–21"); anything else is kept as it is. */
export function flipScore(score: string): string {
  const parts = score.split('–')
  return parts.length === 2 ? `${parts[1]}–${parts[0]}` : score
}

/** The other side's result of a game. */
export const flipResult = (result: PlayerGame['result']): PlayerGame['result'] =>
  result === 'won' ? 'lost' : 'won'
