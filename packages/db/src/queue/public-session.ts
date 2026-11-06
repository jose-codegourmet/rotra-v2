import 'server-only'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { prisma } from '../client/prisma'
import type { QueueSession, StatedBand } from '../generated/prisma/client'
import { ServiceError } from '../service/errors'
import { readPublishedResults } from './results'
import { capacityOf, liveCourts, liveRoster, orderedWaitlist } from './session-store'

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
 * Q-PUBLIC-* (`public-session.page`): the allowlisted `PublicSessionPage` from accepted server
 * state. No phone, level, presence, games, notes beyond the session notes, costs, Off Day or raw
 * sync data. `results` is the stored public copy of the published slides, or null.
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
      participants: roster.map((entry) => {
        const clubPlayer = byId.get(entry.clubPlayerId)
        return {
          name: entry.nameSnapshot,
          pictureUrl: clubPlayer?.player?.avatarRef ?? null,
          hasRotraProfile: !!entry.playerIdAtEntry,
        }
      }),
      waitlist: waitlist.map((w) => byId.get(w.clubPlayerId)?.displayName ?? ''),
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
  status: 'pending' | 'confirmed' | 'declined' | 'closed'
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
