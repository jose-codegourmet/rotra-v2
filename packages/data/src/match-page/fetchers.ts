import { appOrigin } from '../app-origins'
import { getSession } from '../auth/fetchers'
import { requireOnline } from '../mock/bridge'
import { delay } from '../mock/latency'
import { type MockState, readMockState } from '../mock/store'
import { gameWinChanceBreakdown, gameWinChanceFields } from '../player/gameWinChance.rules'
import { mockGameWinChanceFaces } from '../player/mockGameWinChance'
import type {
  PlayerGame,
  PlayerGamePlayer,
  PlayerSessionRecord,
  ProfileVisibility,
} from '../player/player.types'
import { playerProjection } from '../player/projection'
import { isAlwaysPrivatePlayer, isPrivatePlayer } from '../player/visibility'
import { profileCharacterImage } from '../profile-character/fetchers'
import { publicLevel } from '../public-session/publicSession.rules'
import { realGetMatchPage } from '../real/match-page'
import { isRealDataMode } from '../real/mode'
import {
  flipResult,
  flipScore,
  isStandardFormat,
  type MatchFaceIdentity,
  matchCounting,
  matchFaceAccess,
  projectMatchFace,
} from './matchPage.rules'
import type { MatchPage, MatchPagePlayer } from './matchPage.types'

/**
 * The public match page (`/matches/[matchId]`): one match of a valid finalized session, faces
 * masked for the viewer. Null when the match is unknown or not public (the page shows not found).
 */
export async function getMatchPage(
  matchId: string,
  signal?: AbortSignal,
): Promise<MatchPage | null> {
  if (isRealDataMode()) {
    const page = await realGetMatchPage(matchId, signal)
    return page ? resolveRealPage(page) : null
  }
  await delay(200, signal)
  requireOnline()
  const viewerPlayerId = (await getSession('player').catch(() => null))?.account.id ?? null
  return mockMatchPage(readMockState(), matchId, viewerPlayerId)
}

/**
 * Real mode: the server sends picture references and the session page as a path on the Queue app;
 * resolve characters to images and link the page there, as profile games do.
 */
function resolveRealPage(page: MatchPage): MatchPage {
  const picture = (reference: string | null) =>
    profileCharacterImage(reference) ?? reference ?? null
  const face = (player: PlayerGamePlayer): PlayerGamePlayer => ({
    ...player,
    picture: picture(player.picture),
  })
  const game = (g: PlayerGame): PlayerGame => ({
    ...g,
    partnerPlayers: g.partnerPlayers?.map(face),
    opponentPlayers: g.opponentPlayers?.map(face),
  })
  const player = (p: MatchPagePlayer): MatchPagePlayer => ({
    ...p,
    picture: picture(p.picture),
    earlierGames: p.earlierGames.map(game),
  })
  const url = page.session.sessionPageUrl
  return {
    ...page,
    session: {
      ...page.session,
      sessionPageUrl: url?.startsWith('/') ? `${appOrigin('player')}${url}` : (url ?? null),
    },
    teamA: page.teamA.map(player),
    teamB: page.teamB.map(player),
  }
}

/** The profile visibility the mock rules give a player (`isPrivatePlayer` covers guests and unclaimed accounts). */
function mockVisibility(state: MockState, playerId: string): ProfileVisibility {
  if (isAlwaysPrivatePlayer(playerId, state)) return 'always_private'
  return isPrivatePlayer(playerId, state) ? 'private' : 'public'
}

/** The owner of the games record, apart from every name in it. */
const OWNER = Symbol('owner')
type Person = typeof OWNER | string
type Face = { name: string; picture: string | null; identity: MatchFaceIdentity }

/**
 * Mock mode. The fixtures keep no shared Queue match: each match lives in one player's profile
 * games (its `id` is the match id). That player and their partners are Team A, the opponents Team
 * B, and everyone's earlier games are the ones in that player's session record: complete for that
 * player, and for the others the games they played with or against them that night.
 */
function mockMatchPage(
  state: MockState,
  matchId: string,
  viewerPlayerId: string | null,
): MatchPage | null {
  const found = findMockMatch(state, matchId)
  if (!found) return null
  const { owner, session, index } = found
  const match = session.games[index]
  if (!match) return null
  const ranked = session.ranked !== false
  const counting = matchCounting(isStandardFormat(match.format), ranked)
  const clubId = state.clubs.find((club) => club.name === session.clubName)?.id
  const face = (person: Person): Face => {
    const profile =
      person === OWNER
        ? owner
        : state.playerProfiles.find((p) => p.fullName === person || p.nickname === person)
    const name = person === OWNER ? owner.fullName : person
    if (!profile) return { name, picture: null, identity: { kind: 'guest' } }
    return {
      name,
      picture: profileCharacterImage(profile.picture) ?? profile.picture ?? null,
      identity: {
        kind: 'player',
        playerId: profile.playerId,
        visibility: mockVisibility(state, profile.playerId),
      },
    }
  }
  const sides = (game: PlayerGame): [Person[], Person[]] => [
    [OWNER, ...game.partners],
    game.opponents,
  ]
  const playedIn = (person: Person, game: PlayerGame) =>
    sides(game).some((side) => side.includes(person))
  // That person's games in the session up to and including game `upTo`, as profile games count.
  const played = (person: Person, upTo: number) =>
    session.games.slice(0, upTo + 1).filter((g) => playedIn(person, g)).length
  // Win chance (D-2026-11-27-03): the same inputs as the profile games read, so the numbers agree.
  const chanceFaceOf = mockGameWinChanceFaces(state, session)
  const chanceFace = (person: Person) => {
    const { identity } = face(person)
    return chanceFaceOf(identity.kind === 'player' ? identity.playerId : null)
  }
  const courtFace = (person: Person, at: number): PlayerGamePlayer => {
    const f = face(person)
    return {
      ...projectMatchFace(f, f.identity, viewerPlayerId),
      sessionGameNumber: played(person, at),
    }
  }
  // Game `at` read from `person`'s side, like profile games.
  const gameFor = (person: Person, at: number): PlayerGame => {
    const game = session.games[at] as PlayerGame
    const [ownerSide, otherSide] = sides(game)
    const onOwnerSide = ownerSide.includes(person)
    const mine = (onOwnerSide ? ownerSide : otherSide).filter((p) => p !== person)
    const theirs = onOwnerSide ? otherSide : ownerSide
    const partnerPlayers = mine.map((p) => courtFace(p, at))
    const opponentPlayers = theirs.map((p) => courtFace(p, at))
    const base = {
      id: game.id,
      format: game.format,
      partners: partnerPlayers.map((p) => p.name),
      opponents: opponentPlayers.map((p) => p.name),
      partnerPlayers,
      opponentPlayers,
      sessionGameNumber: played(person, at),
    }
    const drawnLeft: Person[] = [person, ...mine]
    const chance = (drawn: Pick<PlayerGame, 'format' | 'counting' | 'result'>) =>
      gameWinChanceFields(drawn, drawnLeft.map(chanceFace), theirs.map(chanceFace))
    if (person === OWNER) return { ...game, ...base, ...chance(game) }
    // A partial game is the owner's participation; for everyone else it reads at match level.
    const drawn = {
      format: game.format,
      counting: matchCounting(isStandardFormat(game.format), ranked),
      result: onOwnerSide ? game.result : flipResult(game.result),
    }
    return {
      ...base,
      ...drawn,
      score: game.score === null || onOwnerSide ? game.score : flipScore(game.score),
      ...(game.gameScores
        ? { gameScores: onOwnerSide ? game.gameScores : game.gameScores.map(flipScore) }
        : {}),
      ...chance(drawn),
    }
  }
  const player = (person: Person): MatchPagePlayer => {
    const f = face(person)
    const access = matchFaceAccess(f.identity, viewerPlayerId)
    const playerId = f.identity.kind === 'player' ? f.identity.playerId : null
    const level =
      access.levelHidden || !playerId
        ? null
        : (state.clubPlayers.find(
            (p) => p.clubId === clubId && p.playerId === playerId && !p.removedAt,
          )?.playingLevel ?? null)
    return {
      ...projectMatchFace(f, f.identity, viewerPlayerId),
      // Mock mode keeps no level per session: the club's current level for them stands in.
      skillGroup: publicLevel(level).skillGroup,
      sessionGameNumber: played(person, index),
      // The record's partial status and note are its owner's participation.
      counting: person === OWNER ? match.counting : counting,
      ...(person === OWNER && match.note && !access.gamesHidden ? { note: match.note } : {}),
      earlierGames: access.gamesHidden
        ? []
        : session.games.flatMap((g, at) =>
            at < index && playedIn(person, g) ? [gameFor(person, at)] : [],
          ),
    }
  }
  const [teamA, teamB] = sides(match)
  const winChance = gameWinChanceBreakdown(
    match.format,
    teamA.map(chanceFace),
    teamB.map(chanceFace),
    match.result === 'won' ? 'left' : 'right',
  )
  return {
    matchId: match.id,
    format: match.format,
    counting,
    score: match.score,
    ...(match.gameScores ? { gameScores: match.gameScores } : {}),
    winner: match.result === 'won' ? 'a' : 'b',
    session: {
      id: session.id,
      title: session.title,
      clubName: session.clubName,
      finishedAt: session.finishedAt,
      sessionPageUrl: session.sessionPageUrl,
      ranked,
    },
    teamA: teamA.map(player),
    teamB: teamB.map(player),
    viewerPlayerId,
    ...(winChance ? { winChance } : {}),
  }
}

/** The profile games record holding this match, and its owner (someone with a ROTRA profile). */
function findMockMatch(state: MockState, matchId: string) {
  for (const [ownerId, sessions] of Object.entries(playerProjection(state).games)) {
    const owner = state.playerProfiles.find((p) => p.playerId === ownerId)
    if (!owner) continue
    for (const session of sessions as PlayerSessionRecord[]) {
      // Games are stored oldest first, as the profile games read counts them.
      const index = session.games.findIndex((g) => g.id === matchId)
      if (index >= 0) return { owner, session, index }
    }
  }
  return null
}
