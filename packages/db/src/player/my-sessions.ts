import 'server-only'
import { maskPublicName } from '@rotra/data/public-session/rules'
import type { PlayerContext } from '../auth/account-context'
import { prisma } from '../client/prisma'
import type { Prisma } from '../generated/prisma/client'
import { orderedWaitlist } from '../queue/session-store'
import { toIso } from '../service/serialize'
import { readPlayerMatchHistory } from './projections'

type Tx = Prisma.TransactionClient

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Upcoming and running sessions. `finalizing` reads as live until Session done commits. */
const OPEN_STATES = ['prepared', 'active', 'finalizing'] as const

/**
 * Every club identity that is the player's: their own saved players at each club (removed rows
 * too, as history keeps them) plus guest identities confirmed as theirs and not revoked.
 */
async function myClubPlayerIds(tx: Tx, playerId: string) {
  const [own, attributed] = await Promise.all([
    tx.clubPlayer.findMany({ where: { playerId }, select: { id: true } }),
    tx.playerHistoryAttribution.findMany({
      where: { playerId, revokedAt: null },
      select: { clubPlayerId: true },
    }),
  ])
  return [...new Set([...own.map((r) => r.id), ...attributed.map((r) => r.clubPlayerId)])]
}

/** Results count as shared only while the page is published with the standings slide. */
async function sharedStandings(tx: Tx | typeof prisma, sessionIds: string[]) {
  if (!sessionIds.length) return new Set<string>()
  const rows = await tx.sessionPublication.findMany({
    where: {
      sessionId: { in: sessionIds },
      state: 'published',
      publishedSlides: { has: 'standings' },
    },
    select: { sessionId: true },
  })
  return new Set(rows.map((r) => r.sessionId))
}

/**
 * P-OWN-PROFILE · My sessions: open sessions where the player holds a slot, waits on the waitlist
 * or has a pending join request, plus their finished sessions from saved history and whether each
 * one's results are shared. Times are raw; the client formats them as the mock does.
 */
export async function readMySessions(context: PlayerContext) {
  const { playerId } = context
  const open = await prisma.$transaction(async (tx) => {
    const ids = await myClubPlayerIds(tx, playerId)
    const sessions = await tx.queueSession.findMany({
      where: {
        state: { in: [...OPEN_STATES] },
        OR: [
          { rosterEntries: { some: { clubPlayerId: { in: ids }, releasedAt: null } } },
          { waitlistEntries: { some: { clubPlayerId: { in: ids } } } },
          {
            joinRequests: {
              some: { status: 'pending', OR: [{ playerId }, { clubPlayerId: { in: ids } }] },
            },
          },
        ],
      },
      orderBy: [{ scheduledStartAt: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        title: true,
        state: true,
        publicSlug: true,
        scheduledStartAt: true,
        scheduledEndAt: true,
        club: { select: { name: true } },
        rosterEntries: {
          where: { clubPlayerId: { in: ids }, releasedAt: null },
          select: { id: true },
          take: 1,
        },
      },
    })
    const mine = new Set(ids)
    const rows = []
    for (const s of sessions) {
      const waitlist = s.rosterEntries.length ? [] : await orderedWaitlist(tx, s.id)
      const index = waitlist.findIndex((w) => mine.has(w.clubPlayerId))
      rows.push({
        id: s.id,
        title: s.title,
        slug: s.publicSlug,
        start: toIso(s.scheduledStartAt),
        end: toIso(s.scheduledEndAt),
        clubName: s.club.name,
        status: s.rosterEntries.length
          ? s.state === 'prepared'
            ? ('confirmed' as const)
            : ('live' as const)
          : index >= 0
            ? ('waitlist' as const)
            : ('requested' as const),
        waitlistPosition: index >= 0 ? index + 1 : null,
      })
    }
    return rows
  })
  const history = await readPlayerMatchHistory(playerId)
  const shared = await sharedStandings(
    prisma,
    history.map((s) => s.id),
  )
  return {
    sessions: open,
    finished: history
      .filter((s) => s.finishedAt)
      .map((s) => ({
        id: s.id,
        title: s.title,
        clubName: s.clubName,
        finishedAt: s.finishedAt as string,
        published: shared.has(s.id),
      })),
  }
}

/**
 * The share card's saved results for one finished session of the signed-in player: whether the
 * club shared its standings, the player's published standing, and each game's other players. A
 * guest (no profile with an RTR ID) shows a masked name and no picture, as on public pages.
 */
export async function readMyShareSession(context: PlayerContext, sessionId: string) {
  const empty = { published: false, position: null, games: {} }
  if (!UUID.test(sessionId)) return empty
  return prisma.$transaction(async (tx) => {
    const publication = await tx.sessionPublication.findUnique({
      where: { sessionId },
      select: {
        state: true,
        publishedSlides: true,
        publishedSnapshot: { select: { standings: true } },
      },
    })
    if (publication?.state !== 'published' || !publication.publishedSlides.includes('standings'))
      return empty
    const ids = await myClubPlayerIds(tx, context.playerId)
    const mine = new Set(ids)
    const standings = Array.isArray(publication.publishedSnapshot?.standings)
      ? (publication.publishedSnapshot.standings as {
          clubPlayerId?: unknown
          position?: unknown
        }[])
      : []
    const standing = standings.find(
      (row) => typeof row.clubPlayerId === 'string' && mine.has(row.clubPlayerId),
    )
    const facts = await tx.playerMatchFact.findMany({
      where: { sessionId, clubPlayerId: { in: ids } },
      select: { matchId: true, partnerEntryIds: true, opponentEntryIds: true },
    })
    const entryIds = [
      ...new Set(facts.flatMap((f) => [...f.partnerEntryIds, ...f.opponentEntryIds])),
    ]
    const entries = await tx.sessionPlayer.findMany({
      where: { sessionId, id: { in: entryIds } },
      select: {
        id: true,
        nameSnapshot: true,
        playerAtEntry: { select: { avatarRef: true, idAllocation: { select: { rtrId: true } } } },
      },
    })
    const byId = new Map(
      entries.map((e) => [
        e.id,
        e.playerAtEntry?.idAllocation
          ? { name: e.nameSnapshot, picture: e.playerAtEntry.avatarRef }
          : { name: maskPublicName(e.nameSnapshot), picture: null },
      ]),
    )
    const participant = (id: string) => byId.get(id) ?? { name: maskPublicName(''), picture: null }
    return {
      published: true,
      position: typeof standing?.position === 'number' ? standing.position : null,
      games: Object.fromEntries(
        facts.map((f) => [
          f.matchId,
          {
            partners: f.partnerEntryIds.map(participant),
            opponents: f.opponentEntryIds.map(participant),
          },
        ]),
      ),
    }
  })
}
