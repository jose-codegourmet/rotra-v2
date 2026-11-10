import 'server-only'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { maskPublicName, publicLevel, publicSkillMix } from '@rotra/data/public-session/rules'
import { loadAccountContext, type PlayerContext } from '../auth/account-context'
import { MOCK_COOKIE_PREFIX } from '../auth/data-mode'
import { type CookieAdapter, verifySubject } from '../auth/supabase'
import { prisma } from '../client/prisma'
import type { QueueSession, StatedBand } from '../generated/prisma/client'
import { ServiceError } from '../service/errors'
import { readPublishedResults } from './results'
import { capacityOf, levelCodeFor, liveCourts, liveRoster, orderedWaitlist } from './session-store'

const E164 = /^\+[1-9][0-9]{7,14}$/
const BANDS: StatedBand[] = ['beginner', 'intermediate', 'advanced', 'unsure']
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Every prepared or live session takes requests while the club has them on (players module). */
const TAKES_REQUESTS = ['prepared', 'active']

/** Rate/abuse guard (proposal pending #248): pending requests one session will hold at once. */
export const MAX_PENDING_REQUESTS_PER_SESSION = 60

/**
 * Visitor ownership (proposal pending #248): a request is owned by whoever holds its receipt, an
 * HMAC of the request ID under a server secret. The Route Handler keeps it in an httpOnly,
 * same-site cookie scoped to the session page, so a reload keeps the visitor's view and nobody
 * else can read the request from its ID or the slug. No receipt is stored in the database.
 */
function receiptFor(requestId: string) {
  const secret = process.env.ROTRA_VISITOR_RECEIPT_SECRET
  if (!secret) throw new ServiceError('unavailable')
  return createHmac('sha256', secret).update(`join-request:${requestId}`).digest('base64url')
}

function receiptMatches(requestId: string, receipt: string | null | undefined) {
  if (!receipt) return false
  const expected = Buffer.from(receiptFor(requestId))
  const given = Buffer.from(receipt)
  return expected.length === given.length && timingSafeEqual(expected, given)
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

/** Accepted states only. `finalizing` reads as active until Session done commits. */
function publicStatus(
  session: QueueSession,
): 'prepared' | 'active' | 'completed' | 'invalid' | 'cancelled' {
  if (session.state === 'finalizing') return 'active'
  return session.state
}

/**
 * Who opened the operator preview `/sessions/[sessionId]/public-page` (#469): the session's public
 * slug and whether the signed-in club account owns the session. Null for an unknown session.
 * Anyone else (signed out, another club, a non-club account) is a visitor and is sent to
 * `/s/<slug>`, where `readPublicSession` alone decides what is visible; the slug is the public
 * address, so returning it reveals nothing the session link does not. Read-only: refreshed
 * cookies are the proxy's job, so `cookies.setAll` may be a no-op.
 */
export async function readPreviewAudience(cookies: CookieAdapter, sessionId: string) {
  if (!UUID.test(sessionId)) return null
  const session = await prisma.queueSession.findUnique({
    where: { id: sessionId },
    select: { publicSlug: true, clubId: true },
  })
  if (!session) return null
  const verified = await verifySubject(
    {
      getAll: () => cookies.getAll().filter((c) => !c.name.startsWith(MOCK_COOKIE_PREFIX)),
      setAll: (values, headers) => cookies.setAll(values, headers),
    },
    'club',
  )
  const club = verified ? await loadAccountContext(verified, 'club') : null
  return { slug: session.publicSlug, operator: club?.clubId === session.clubId }
}

/**
 * Q-PUBLIC-* (`public-session.page`): the allowlisted `PublicSessionPage` from accepted server
 * state. No phone, presence, games, notes beyond the session notes, costs, Off Day or raw
 * sync data. Participant and waitlist names are masked here (`maskPublicName`, #475), so a full
 * name never leaves the server. `skillMix` is aggregate counts only (#474). `results` is the stored public copy of the published slides, or null.
 */
export async function readPublicSession(slug: string) {
  const session = await prisma.queueSession.findUnique({
    where: { publicSlug: slug },
    include: {
      club: { select: { name: true, logoRef: true } },
      publication: { select: { state: true } },
    },
  })
  // A page removed by retention is gone for the public; the session and its history are not.
  if (!session || session.publication?.state === 'deleted') throw new ServiceError('not_found')
  return prisma.$transaction(async (tx) => {
    const courts = await liveCourts(tx, session.id)
    const roster = await liveRoster(tx, session.id)
    const waitlist = await orderedWaitlist(tx, session.id)
    const clubPlayers = await tx.clubPlayer.findMany({
      where: {
        clubId: session.clubId,
        id: { in: [...roster.map((r) => r.clubPlayerId), ...waitlist.map((w) => w.clubPlayerId)] },
      },
      select: { id: true, displayName: true, player: { select: { avatarRef: true } } },
    })
    const byId = new Map(clubPlayers.map((p) => [p.id, p]))
    const capacity = await capacityOf(tx, session)
    const streams = await tx.deviceSessionStream.findMany({
      where: { sessionId: session.id, state: 'open' },
      select: { contiguousSequence: true, highestReceivedSeq: true },
    })
    return {
      slug: session.publicSlug,
      status: publicStatus(session),
      title: session.title,
      start: session.scheduledStartAt.getTime(),
      end: session.scheduledEndAt.getTime(),
      club: {
        id: session.clubId,
        name: session.club.name,
        initials: initials(session.club.name),
        logoUrl: session.club.logoRef,
      },
      venue: { name: session.venueName ?? '', address: session.venueAddress },
      courts: courts.map((c) => c.label),
      formats: { singles: session.allowSingles, doubles: session.allowDoubles },
      mode: session.sessionMode,
      minimum: session.minimumGames,
      notes: session.notes,
      participantCount: roster.length,
      participants: roster.slice(0, 12).map((entry) => {
        const clubPlayer = byId.get(entry.clubPlayerId)
        return {
          name: maskPublicName(entry.nameSnapshot),
          pictureUrl: clubPlayer?.player?.avatarRef ?? null,
          ...publicLevel(levelCodeFor(entry.skillLevelId)),
        }
      }),
      // #474: counts over the same roster as `participants`.
      skillMix: publicSkillMix(roster.map((entry) => levelCodeFor(entry.skillLevelId))),
      waitlist: waitlist.map((w) => {
        const clubPlayer = byId.get(w.clubPlayerId)
        return {
          name: maskPublicName(clubPlayer?.displayName ?? ''),
          pictureUrl: clubPlayer?.player?.avatarRef ?? null,
          ...publicLevel(levelCodeFor(w.skillLevelId)),
        }
      }),
      openSlots: Math.max(0, capacity - roster.length),
      slotBudget: capacity,
      acceptJoinRequests: session.acceptJoinRequests && TAKES_REQUESTS.includes(session.state),
      lastSyncedAt: session.updatedAt.getTime(),
      hasPendingChanges: streams.some((s) => s.highestReceivedSeq > s.contiguousSequence),
      results: session.state === 'completed' ? await readPublishedResults(session.id) : null,
    }
  })
}

async function myRequestDto(request: {
  id: string
  name: string
  status: 'pending' | 'confirmed' | 'declined' | 'closed' | 'cancelled'
  sessionId: string
  clubPlayerId: string | null
}) {
  let waitlistPosition: number | null = null
  if (request.status === 'confirmed' && request.clubPlayerId)
    waitlistPosition = await prisma.$transaction(async (tx) => {
      const index = (await orderedWaitlist(tx, request.sessionId)).findIndex(
        (w) => w.clubPlayerId === request.clubPlayerId,
      )
      return index < 0 ? null : index + 1
    })
  return { requestId: request.id, name: request.name, status: request.status, waitlistPosition }
}

/**
 * Q-PUBLIC · Request to join. Prepared or active sessions with requests on. Never reserves a slot: only the Queue Master's confirmation places
 * the player (`confirmJoinRequest`). The client sends a stable `requestId`; a lost response or
 * retry with the same fields returns the same request and receipt. Returns the receipt for the
 * Route Handler's httpOnly cookie; it never goes in the JSON body.
 */
export async function sendJoinRequest(
  slug: string,
  input: {
    requestId: string
    name: string
    nickname?: string | null
    phone?: string | null
    statedBand: StatedBand
  },
) {
  if (!UUID.test(input.requestId)) throw new ServiceError('invalid')
  const name = input.name.trim()
  if (!name) throw new ServiceError('invalid', { name: 'Enter your name.' })
  const phone = input.phone?.trim() || null
  if (phone && !E164.test(phone))
    throw new ServiceError('invalid', { phone: 'Enter a full mobile number, or leave it empty.' })
  if (!BANDS.includes(input.statedBand))
    throw new ServiceError('invalid', { statedBand: 'Choose a level.' })
  const session = await prisma.queueSession.findUnique({ where: { publicSlug: slug } })
  if (!session) throw new ServiceError('not_found')
  const receipt = receiptFor(input.requestId)
  try {
    const request = await prisma.$transaction(async (tx) => {
      const existing = await tx.sessionJoinRequest.findUnique({ where: { id: input.requestId } })
      if (existing) {
        if (
          existing.sessionId !== session.id ||
          existing.name !== name ||
          existing.phoneE164 !== phone
        )
          throw new ServiceError('conflict')
        return existing
      }
      const rows = await tx.$queryRaw<{ state: string; accept: boolean }[]>`
        SELECT "state"::text AS state, "accept_join_requests" AS accept FROM "queue_sessions"
        WHERE "id" = ${session.id}::uuid FOR UPDATE`
      const current = rows[0]
      // A cancelled session's page shows Cancelled and takes no requests.
      if (current?.state === 'cancelled')
        throw new ServiceError('forbidden', { request: 'This session is cancelled.' })
      if (!current || !TAKES_REQUESTS.includes(current.state) || !current.accept)
        throw new ServiceError('forbidden', { request: 'This session is not taking requests.' })
      const pending = await tx.sessionJoinRequest.count({
        where: { sessionId: session.id, status: 'pending' },
      })
      if (pending >= MAX_PENDING_REQUESTS_PER_SESSION)
        throw new ServiceError('unavailable', {
          request: 'Too many requests are waiting. Try again later.',
        })
      if (phone) {
        const duplicate = await tx.sessionJoinRequest.findFirst({
          where: { sessionId: session.id, status: 'pending', phoneE164: phone },
          select: { id: true },
        })
        if (duplicate)
          throw new ServiceError('conflict', {
            request: 'A request with this number is already waiting.',
          })
      }
      return tx.sessionJoinRequest.create({
        data: {
          id: input.requestId,
          clubId: session.clubId,
          sessionId: session.id,
          name,
          nickname: input.nickname?.trim() || null,
          phoneE164: phone,
          statedBand: input.statedBand,
          requestedAt: new Date(),
        },
      })
    })
    return { body: await myRequestDto(request), receipt }
  } catch (error) {
    if ((error as { code?: string })?.code === 'P2002') throw new ServiceError('conflict')
    throw error
  }
}

/**
 * Q-PUBLIC · My request. Needs the request's receipt; a missing or wrong receipt, another
 * session's slug, or an unknown ID all look the same (`not_found`).
 */
export async function readMyJoinRequest(
  slug: string,
  requestId: string,
  receipt: string | null | undefined,
) {
  if (!receiptMatches(requestId, receipt)) throw new ServiceError('not_found')
  const request = await prisma.sessionJoinRequest.findUnique({
    where: { id: requestId },
    include: { session: { select: { publicSlug: true } } },
  })
  if (!request || request.session.publicSlug !== slug) throw new ServiceError('not_found')
  return myRequestDto(request)
}

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0]

/**
 * The signed-in Player's own place in this session (D-2026-11-09-02), for the join card: their
 * name, whether they hold a slot or a waitlist place, and their latest request. Own data only.
 */
async function playerStanding(tx: Tx, playerId: string, sessionId: string) {
  const player = await tx.player.findUnique({
    where: { id: playerId },
    select: {
      fullName: true,
      nickname: true,
      avatarRef: true,
      idAllocation: { select: { rtrId: true } },
    },
  })
  if (!player) throw new ServiceError('forbidden')
  const roster = await tx.sessionPlayer.findFirst({
    where: { sessionId, releasedAt: null, clubPlayer: { playerId } },
    select: { id: true },
  })
  const waitlist = await orderedWaitlist(tx, sessionId)
  const mine = waitlist.length
    ? await tx.clubPlayer.findMany({
        where: { id: { in: waitlist.map((w) => w.clubPlayerId) }, playerId },
        select: { id: true },
      })
    : []
  const waiting = new Set(mine.map((c) => c.id))
  const request = await tx.sessionJoinRequest.findFirst({
    where: { sessionId, playerId },
    orderBy: [{ requestedAt: 'desc' }, { id: 'desc' }],
  })
  const inSession = !!roster || waitlist.some((w) => waiting.has(w.clubPlayerId))
  let joinRequest = null
  // A confirmed request whose place the Queue Master has since removed is history, not a status:
  // the card offers Request to join again (the server accepts a new request then).
  if (request && !(request.status === 'confirmed' && !inSession)) {
    const index =
      request.status === 'confirmed' && request.clubPlayerId
        ? waitlist.findIndex((w) => w.clubPlayerId === request.clubPlayerId)
        : -1
    joinRequest = {
      requestId: request.id,
      name: request.name,
      status: request.status,
      waitlistPosition: index < 0 ? null : index + 1,
    }
  }
  return {
    name: player.fullName,
    // The session page's account bar (#693)
    nickname: player.nickname,
    rtrId: player.idAllocation?.rtrId ?? null,
    pictureUrl: player.avatarRef,
    inSession,
    joinRequest,
  }
}

/** #569: authenticated Player only. Eligibility is the current roster link, never a browser ID. */
export async function readPlayerSessionAccess(context: PlayerContext, slug: string) {
  const session = await prisma.queueSession.findUnique({
    where: { publicSlug: slug },
    select: { id: true, publication: { select: { state: true } } },
  })
  if (!session || session.publication?.state === 'deleted') throw new ServiceError('not_found')
  return prisma.$transaction(async (tx) => {
    const roster = await liveRoster(tx, session.id)
    const linked = await tx.clubPlayer.findMany({
      where: { id: { in: roster.map((entry) => entry.clubPlayerId) } },
      select: { id: true, playerId: true, player: { select: { avatarRef: true } } },
    })
    const fullRoster = linked.some((entry) => entry.playerId === context.playerId)
    const pictures = new Map(linked.map((entry) => [entry.id, entry.player?.avatarRef ?? null]))
    const byId = new Map(roster.map((entry) => [entry.id, entry]))
    // Only waiting lineups. No presence, court holds, games, scores, contacts or operator notes.
    const matches = await tx.match.findMany({
      where: { sessionId: session.id, state: 'waiting', removedAt: null },
      orderBy: [{ queuePosition: 'asc' }, { matchNo: 'asc' }],
      select: {
        matchNo: true,
        format: true,
        participations: {
          where: { leftAt: null },
          orderBy: [{ joinedAt: 'asc' }, { id: 'asc' }],
          select: { team: true, sessionPlayerId: true },
        },
      },
    })
    const team = (members: { team: string; sessionPlayerId: string }[], side: string) =>
      members
        .filter((member) => member.team === side)
        .map((member) => {
          const entry = byId.get(member.sessionPlayerId)
          return {
            name: maskPublicName(entry?.nameSnapshot ?? ''),
            level: levelCodeFor(entry?.skillLevelId ?? null),
          }
        })
    return {
      playerId: context.playerId,
      ...(await playerStanding(tx, context.playerId, session.id)),
      fullRoster,
      participants: (fullRoster ? roster : roster.slice(0, 12)).map((entry) => ({
        name: maskPublicName(entry.nameSnapshot),
        pictureUrl: pictures.get(entry.clubPlayerId) ?? null,
        ...publicLevel(levelCodeFor(entry.skillLevelId)),
      })),
      queue: matches.map((match) => ({
        matchNo: match.matchNo,
        format: match.format,
        teamA: team(match.participations, 'A'),
        teamB: team(match.participations, 'B'),
      })),
    }
  })
}

/** The Player's latest club level as a stated band, for a one-tap request; `unsure` without one. */
async function bandFor(tx: Tx, clubId: string, playerId: string): Promise<StatedBand> {
  const last = await tx.sessionPlayer.findFirst({
    where: { clubId, skillLevelId: { not: null }, clubPlayer: { playerId } },
    orderBy: [{ confirmedAt: 'desc' }, { id: 'desc' }],
    select: { skillLevelId: true },
  })
  const band = levelCodeFor(last?.skillLevelId ?? null)?.split('_')[0]
  return BANDS.includes(band as StatedBand) ? (band as StatedBand) : 'unsure'
}

/**
 * Q-PUBLIC-JOIN · **Request to join as NAME** (D-2026-11-09-02): a signed-in Player's one tap. The
 * request carries the account (`player_id`) and the profile's name; no phone. Same session rules
 * and cap as a guest's request. Refused while the Player's earlier request is pending (also the
 * partial unique index) or once they hold a slot or a waitlist place. Never reserves a slot.
 */
export async function joinSessionAsPlayer(context: PlayerContext, slug: string) {
  const session = await prisma.queueSession.findUnique({ where: { publicSlug: slug } })
  if (!session) throw new ServiceError('not_found')
  const requestId = crypto.randomUUID()
  try {
    await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<{ state: string; accept: boolean }[]>`
        SELECT "state"::text AS state, "accept_join_requests" AS accept FROM "queue_sessions"
        WHERE "id" = ${session.id}::uuid FOR UPDATE`
      const current = rows[0]
      if (current?.state === 'cancelled')
        throw new ServiceError('forbidden', { request: 'This session is cancelled.' })
      if (!current || !TAKES_REQUESTS.includes(current.state) || !current.accept)
        throw new ServiceError('forbidden', { request: 'This session is not taking requests.' })
      const standing = await playerStanding(tx, context.playerId, session.id)
      if (standing.inSession)
        throw new ServiceError('conflict', { request: "You're already in this session." })
      if (standing.joinRequest?.status === 'pending')
        throw new ServiceError('conflict', { request: 'Your request is already sent.' })
      const pending = await tx.sessionJoinRequest.count({
        where: { sessionId: session.id, status: 'pending' },
      })
      if (pending >= MAX_PENDING_REQUESTS_PER_SESSION)
        throw new ServiceError('unavailable', {
          request: 'Too many requests are waiting. Try again later.',
        })
      const profile = await tx.player.findUniqueOrThrow({
        where: { id: context.playerId },
        select: { fullName: true, nickname: true },
      })
      await tx.sessionJoinRequest.create({
        data: {
          id: requestId,
          clubId: session.clubId,
          sessionId: session.id,
          playerId: context.playerId,
          name: profile.fullName,
          nickname: profile.nickname,
          phoneE164: null,
          statedBand: await bandFor(tx, session.clubId, context.playerId),
          requestedAt: new Date(),
        },
      })
    })
  } catch (error) {
    if ((error as { code?: string })?.code === 'P2002')
      throw new ServiceError('conflict', { request: 'Your request is already sent.' })
    throw error
  }
  return { requestId, message: 'Request sent' }
}

/** Q-PUBLIC-JOIN · **Cancel request**: the Player's own pending request becomes `cancelled`. */
export async function cancelPlayerJoinRequest(context: PlayerContext, slug: string) {
  const session = await prisma.queueSession.findUnique({
    where: { publicSlug: slug },
    select: { id: true },
  })
  if (!session) throw new ServiceError('not_found')
  const pending = await prisma.sessionJoinRequest.findFirst({
    where: { sessionId: session.id, playerId: context.playerId, status: 'pending' },
    select: { id: true },
  })
  // Guarded on `pending`, so a request the Queue Master decided meanwhile is never overwritten.
  const { count } = pending
    ? await prisma.sessionJoinRequest.updateMany({
        where: { id: pending.id, status: 'pending' },
        data: { status: 'cancelled', decidedAt: new Date(), revision: { increment: 1 } },
      })
    : { count: 0 }
  if (!pending || !count)
    throw new ServiceError('conflict', { request: 'This join request has already been decided.' })
  return { requestId: pending.id, message: 'Request cancelled' }
}
