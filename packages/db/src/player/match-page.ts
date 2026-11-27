import 'server-only'
import {
  beforeGameRecord,
  type MatchFaceIdentity,
  matchCounting,
  matchFaceAccess,
  projectMatchFace,
  sideScore,
} from '@rotra/data/match-page/rules'
import type { MatchPage, MatchPagePlayer } from '@rotra/data/match-page/types'
import { gameWinChanceBreakdown, gameWinChanceFields } from '@rotra/data/player/game-win-chance'
import { countYearCountedWins } from '@rotra/data/player/rules'
import type { PlayerGame, PlayerGamePlayer, ProfileVisibility } from '@rotra/data/player/types'
import { publicLevel } from '@rotra/data/public-session/rules'
import { prisma } from '../client/prisma'
import { levelCodeFor } from '../queue/session-store'
import { ServiceError } from '../service/errors'
import { toIso } from '../service/serialize'
import { readPlayerMatchHistory } from './projections'
import { readClubForms, winChanceFace } from './win-chance'

/** Public reads take an ID from the URL; anything that is not a UUID is simply not found. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * The public match page (`/matches/[matchId]`, public match page rules of November 25, 2026): the
 * match's own facts for the court, and the same session's earlier facts per participant for
 * Before this game. Visible registered players also get their counted-game win rate this year.
 * Only a match with facts in a valid finalized (`completed`) session has a page,
 * the same matches profile games show (`readPlayerMatchHistory`); anything else is not found.
 * Faces follow the profile rules for the viewer (`matchFaceAccess`), applied here, so a masked
 * name never leaves the server. No costs, levels beyond the skill group, Off Day or private
 * identity. No new table: `player_match_facts.match_id` is the shared id.
 *
 * Win chance (D-2026-11-27-03): the match and every earlier game carry it, from each face's level
 * in this session and its club form before it, the inputs `readPlayerMatchHistory` uses, so the
 * games list and this page agree. The breakdown's rows show each face's level and club win rate as
 * the Win chance dialog draws them; names stay masked through `teamA` / `teamB`.
 */
export async function readMatchPage(matchId: string, viewerId: string | null): Promise<MatchPage> {
  if (!UUID.test(matchId)) throw new ServiceError('not_found')
  const { page, yearPlayerIds } = await prisma.$transaction<{
    page: MatchPage
    yearPlayerIds: Set<string>
  }>(async (tx) => {
    const any = await tx.playerMatchFact.findFirst({
      where: { matchId },
      select: { clubId: true, sessionId: true },
    })
    if (!any) throw new ServiceError('not_found')
    const session = await tx.queueSession.findFirst({
      where: { id: any.sessionId, clubId: any.clubId, state: 'completed' },
      select: {
        id: true,
        title: true,
        finalizedAt: true,
        publicSlug: true,
        recordGames: true,
        scheduledStartAt: true,
        club: { select: { name: true } },
        publication: { select: { publishedAt: true } },
      },
    })
    if (!session?.finalizedAt) throw new ServiceError('not_found')
    const [facts, entries] = await Promise.all([
      // The session's facts in play order, the same order profile games number them in.
      tx.playerMatchFact.findMany({
        where: { clubId: any.clubId, sessionId: session.id },
        orderBy: [{ playedAt: 'asc' }, { matchId: 'asc' }],
        select: {
          matchId: true,
          sessionPlayerId: true,
          format: true,
          team: true,
          winningTeam: true,
          fullParticipation: true,
          standardMatch: true,
          skillLevelSnapshotId: true,
          partnerEntryIds: true,
          opponentEntryIds: true,
          teamAScore: true,
          teamBScore: true,
        },
      }),
      tx.sessionPlayer.findMany({
        where: { clubId: any.clubId, sessionId: session.id },
        select: {
          id: true,
          clubPlayerId: true,
          nameSnapshot: true,
          playerAtEntry: {
            select: {
              id: true,
              avatarRef: true,
              profileState: true,
              profileVisibility: true,
              idAllocation: { select: { rtrId: true } },
            },
          },
        },
      }),
    ])
    type Fact = (typeof facts)[number]
    const ranked = session.recordGames
    const byEntry = new Map(entries.map((e) => [e.id, e]))
    const factsOf = new Map<string, Fact[]>()
    for (const f of facts)
      factsOf.set(f.sessionPlayerId, [...(factsOf.get(f.sessionPlayerId) ?? []), f])
    // That entry's games in the session up to and including the match (the games badge).
    const gameNumber = (entryId: string, ofMatch: string) =>
      (factsOf.get(entryId)?.findIndex((f) => f.matchId === ofMatch) ?? -1) + 1
    // Win chance inputs: the level an entry played the session at (its first fact) and its club
    // form before this session; one query for everyone with a game in the session.
    const formOf = await readClubForms(
      tx,
      [any.clubId],
      entries.flatMap((e) => (factsOf.has(e.id) ? [e.clubPlayerId] : [])),
    )
    const chanceFace = (entryId: string) =>
      winChanceFace(
        factsOf.get(entryId)?.[0]?.skillLevelSnapshotId,
        formOf(byEntry.get(entryId)?.clubPlayerId, session),
      )

    /**
     * As profile games: a ROTRA player has a profile with an RTR ID, anyone else is a guest. An
     * unclaimed player is public until they register (D-2026-11-16-04); Always private is kept.
     */
    const identity = (entryId: string): MatchFaceIdentity => {
      const player = byEntry.get(entryId)?.playerAtEntry
      if (!player?.idAllocation) return { kind: 'guest' }
      const visibility: ProfileVisibility =
        player.profileVisibility === 'always_private' || player.profileState === 'claimed'
          ? player.profileVisibility
          : 'public'
      return { kind: 'player', playerId: player.id, visibility }
    }
    const face = (entryId: string) => {
      const entry = byEntry.get(entryId)
      return projectMatchFace(
        { name: entry?.nameSnapshot ?? '', picture: entry?.playerAtEntry?.avatarRef ?? null },
        identity(entryId),
        viewerId,
      )
    }
    const courtFace = (entryId: string, ofMatch: string): PlayerGamePlayer => ({
      ...face(entryId),
      sessionGameNumber: gameNumber(entryId, ofMatch),
    })
    // How a fact counts for its entry, exactly as profile games set it.
    const countingOf = (f: Fact): PlayerGame['counting'] =>
      f.fullParticipation ? matchCounting(f.standardMatch, ranked) : 'partial'
    // One fact as a game read from its entry's side, like `readPlayerMatchHistory`'s games.
    const gameOf = (f: Fact): PlayerGame => {
      const partnerPlayers = f.partnerEntryIds.map((id) => courtFace(id, f.matchId))
      const opponentPlayers = f.opponentEntryIds.map((id) => courtFace(id, f.matchId))
      const drawn = {
        format: f.format,
        counting: countingOf(f),
        result: f.team === f.winningTeam ? ('won' as const) : ('lost' as const),
      }
      return {
        id: f.matchId,
        sessionGameNumber: gameNumber(f.sessionPlayerId, f.matchId),
        partners: partnerPlayers.map((p) => p.name),
        opponents: opponentPlayers.map((p) => p.name),
        partnerPlayers,
        opponentPlayers,
        ...drawn,
        score: sideScore(f.teamAScore, f.teamBScore, f.team === 'A' ? 'a' : 'b'),
        ...gameWinChanceFields(
          drawn,
          [f.sessionPlayerId, ...f.partnerEntryIds].map(chanceFace),
          f.opponentEntryIds.map(chanceFace),
        ),
      }
    }

    const matchFacts = facts.filter((f) => f.matchId === matchId)
    const first = matchFacts[0]
    if (!first) throw new ServiceError('not_found')
    /**
     * Who was on court when the match ended, in Queue's order: every fact lists the finishers of the
     * other team as opponents (`buildFacts`), so a fact of the other side names this side. Someone
     * who left mid-game has a fact of their own but is not on the court.
     */
    const side = (team: 'A' | 'B') =>
      matchFacts.find((f) => f.team !== team)?.opponentEntryIds ??
      matchFacts.filter((f) => f.team === team).map((f) => f.sessionPlayerId)
    const yearPlayerIds = new Set<string>()
    const player = (entryId: string): MatchPagePlayer => {
      const who = identity(entryId)
      const access = matchFaceAccess(who, viewerId)
      if (
        !access.gamesHidden &&
        who.kind === 'player' &&
        byEntry.get(entryId)?.playerAtEntry?.profileState === 'claimed'
      ) {
        yearPlayerIds.add(who.playerId)
      }
      const own = matchFacts.find((f) => f.sessionPlayerId === entryId)
      const all = factsOf.get(entryId) ?? []
      const at = all.findIndex((f) => f.matchId === matchId)
      const earlierGames = access.gamesHidden || at < 0 ? [] : all.slice(0, at).map(gameOf)
      return {
        ...face(entryId),
        skillGroup: access.levelHidden
          ? null
          : publicLevel(levelCodeFor(own?.skillLevelSnapshotId ?? null)).skillGroup,
        sessionGameNumber: at + 1,
        counting: own ? countingOf(own) : matchCounting(first.standardMatch, ranked),
        earlierGames,
        beforeGame: access.gamesHidden ? null : beforeGameRecord(earlierGames),
      }
    }
    const winChance = gameWinChanceBreakdown(
      first.format,
      side('A').map(chanceFace),
      side('B').map(chanceFace),
      first.winningTeam === 'A' ? 'left' : 'right',
    )
    return {
      page: {
        matchId,
        format: first.format,
        counting: matchCounting(first.standardMatch, ranked),
        score: sideScore(first.teamAScore, first.teamBScore, 'a'),
        winner: first.winningTeam === 'A' ? 'a' : 'b',
        session: {
          id: session.id,
          title: session.title,
          clubName: session.club.name,
          finishedAt: toIso(session.finalizedAt),
          sessionPageUrl: session.publication?.publishedAt ? `/s/${session.publicSlug}` : null,
          ranked,
        },
        teamA: side('A').map(player),
        teamB: side('B').map(player),
        viewerPlayerId: viewerId,
        ...(winChance ? { winChance } : {}),
      },
      yearPlayerIds,
    }
  })

  // Official history includes confirmed guest attributions and opens its own transaction.
  // The court read has already released its connection, including on a one-connection pool.
  const now = Date.now()
  const yearRates = new Map(
    await Promise.all(
      [...yearPlayerIds].map(async (playerId) => {
        const history = await readPlayerMatchHistory(playerId)
        const { games, wins } = countYearCountedWins(history, now)
        return [playerId, games ? Math.round((wins / games) * 100) : null] as const
      }),
    ),
  )
  const addYearRate = (player: MatchPagePlayer): MatchPagePlayer => ({
    ...player,
    yearWinRate:
      player.playerId && player.beforeGame ? (yearRates.get(player.playerId) ?? null) : null,
  })
  return { ...page, teamA: page.teamA.map(addYearRate), teamB: page.teamB.map(addYearRate) }
}
