import 'server-only'
import { createHmac, timingSafeEqual } from 'node:crypto'
import {
  computeStandings,
  courtFreeSince,
  courtNames,
  holdsCourt,
  sharePositions,
} from '@rotra/data/match/match.rules'
import type { Match } from '@rotra/data/match/types'
import { resolveProfileBanner } from '@rotra/data/profile-banner/rules'
import {
  makeInviteCode,
  maskPublicName,
  myMatchLabel,
  publicFirstName,
  publicLevel,
  publicSkillMix,
  selfCheckInMark,
} from '@rotra/data/public-session/rules'
import type {
  MyNightStage,
  PublicCourtNow,
  PublicHistoryMatch,
  PublicMatchHistory,
  PublicMatchPlayer,
} from '@rotra/data/public-session/types'
import { sessionRecordHistory } from '@rotra/data/queue-session/sessionRecord.rules'
import type { SessionCourt as CourtView } from '@rotra/data/queue-session/types'
import type { SessionPlayer as RosterView } from '@rotra/data/session-roster/types'
import { readShownProfileBanners } from '../admin/profile-banners'
import { type ClubContext, loadAccountContext, type PlayerContext } from '../auth/account-context'
import { MOCK_COOKIE_PREFIX } from '../auth/data-mode'
import { type CookieAdapter, verifySubject } from '../auth/supabase'
import { prisma } from '../client/prisma'
import type { JoinRequestPlacement, QueueSession, StatedBand } from '../generated/prisma/client'
import { ServiceError } from '../service/errors'
import { savedLevelOf } from './club-players'
import { levelRestrictionDto } from './dto'
import { closeStaleMatchRequests } from './match-request-store'
import { peopleFor, readMyMatchRequest } from './match-requests'
import { matchContext } from './match-store'
import { readPublishedResults } from './results'
import { endedState, shownHostRows } from './session-host-snapshots'
import { levelRestrictionBlockIn, placeClubMember, stepDownIn } from './session-roster'
import {
  COURT_ORDER,
  capacityOf,
  derivedId,
  LIVE_ENTRY,
  levelCodeFor,
  liveCourts,
  liveRoster,
  lockSession,
  mapDatabaseError,
  orderedWaitlist,
  recomputeMinimum,
  requireState,
  touchSession,
} from './session-store'
import { myPendingSlotTransfer } from './slot-transfers'

const BANDS: StatedBand[] = ['beginner', 'intermediate', 'advanced', 'unsure']
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Every prepared or live session takes requests while the club has them on (players module). */
const TAKES_REQUESTS = ['prepared', 'active']
/** Join requests end at Start (D-2026-11-11-11): none is created once the session is live. */
const JOIN_REQUESTS_STARTED = 'The session has started, so online join requests are closed.'

/**
 * The picture a saved player shows: a registered player's own, else the one the club set for its
 * guest or unclaimed player (D-2026-11-09-12), else initials.
 */
const pictureOf = (
  clubPlayer: { avatarRef: string | null; player: { avatarRef: string | null } | null } | undefined,
) => (clubPlayer?.player ? clubPlayer.player.avatarRef : (clubPlayer?.avatarRef ?? null))

/** Rate/abuse guard (proposal pending #248): pending requests one session will hold at once. */
export const MAX_PENDING_REQUESTS_PER_SESSION = 60

/**
 * Faces on the published results (2026-11-13 finished session and awards logs): the public copy
 * holds names and counts only, so each standings row, award winner and Off Day row gets its
 * picture, and its `participant` index (the live roster order, which the signed-in read's
 * `participants` share, so the face opens the profile card), from the live roster by name, the
 * same source as `participants`. A name that two roster entries share gets neither. The private
 * snapshot is never read here.
 */
function withResultPictures(
  results: Record<string, unknown> | null,
  roster: { name: string; pictureUrl: string | null }[],
) {
  if (!results) return results
  const seen = new Map<string, { pictureUrl: string | null; participant: number }>()
  const clash = new Set<string>()
  roster.forEach((entry, participant) => {
    if (seen.has(entry.name)) clash.add(entry.name)
    else seen.set(entry.name, { pictureUrl: entry.pictureUrl, participant })
  })
  const face = <T>(row: T): T => {
    if (!row || typeof row !== 'object' || !('name' in row)) return row
    const name = (row as { name: unknown }).name
    const match = typeof name === 'string' && !clash.has(name) ? seen.get(name) : undefined
    return {
      ...row,
      pictureUrl: match?.pictureUrl ?? null,
      ...(match ? { participant: match.participant } : {}),
    }
  }
  const out: Record<string, unknown> = { ...results }
  // Published copies saved before shared positions (or with gaps) show 1, 1, 2 (owner, November 20, 2026).
  if (Array.isArray(out.standings))
    out.standings = sharePositions(
      out.standings as { wins: number; losses: number; position: number }[],
    ).map(face)
  if (Array.isArray(out.offDay)) out.offDay = out.offDay.map(face)
  if (out.awards && typeof out.awards === 'object') {
    const awards = out.awards as Record<string, unknown>
    out.awards = { ...awards, mvp: face(awards.mvp), mostImproved: face(awards.mostImproved) }
  }
  return out
}

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
    // Epic #1002 (#1006): the current hosts ride the same read, oldest first. Zero is valid. A
    // finished session shows the rows frozen at its end, by their snapshot name (#1008).
    const ended = endedState(session.state)
    const hostRows = await tx.sessionHost.findMany({
      where: { sessionId: session.id, ...shownHostRows(session.state) },
      orderBy: [{ assignedAt: 'asc' }, { id: 'asc' }],
      select: { clubPlayerId: true, nameSnapshot: true },
    })
    const clubPlayers = await tx.clubPlayer.findMany({
      where: {
        clubId: session.clubId,
        id: {
          in: [
            ...roster.map((r) => r.clubPlayerId),
            ...waitlist.map((w) => w.clubPlayerId),
            ...hostRows.map((h) => h.clubPlayerId),
          ],
        },
      },
      select: {
        id: true,
        displayName: true,
        avatarRef: true,
        player: { select: { avatarRef: true } },
        assessments: { orderBy: { assessedAt: 'desc' }, take: 1, select: { skillLevelId: true } },
      },
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
      /** Restrictions (D-2026-11-19-12): the Levels row in Details. */
      levelRestriction: levelRestrictionDto(session),
      minimum: session.minimumGames,
      notes: session.notes,
      participantCount: roster.length,
      participants: roster.slice(0, 12).map((entry) => {
        const clubPlayer = byId.get(entry.clubPlayerId)
        return {
          name: maskPublicName(entry.nameSnapshot),
          pictureUrl: pictureOf(clubPlayer),
          ...publicLevel(levelCodeFor(entry.skillLevelId)),
        }
      }),
      // #474: counts over the same roster as `participants`.
      skillMix: publicSkillMix(roster.map((entry) => levelCodeFor(entry.skillLevelId))),
      // The Hosts section (#1006, D-2026-11-22-01): the same masked name and picture as Players. A
      // host who plays is also in `participants`; capacity and counts read the roster only.
      hosts: hostRows.flatMap((host) => {
        const clubPlayer = byId.get(host.clubPlayerId)
        if (!clubPlayer) return []
        const placed = roster.find((r) => r.clubPlayerId === host.clubPlayerId)
        const waiting = waitlist.find((w) => w.clubPlayerId === host.clubPlayerId)
        const levelId =
          placed?.skillLevelId ?? waiting?.skillLevelId ?? clubPlayer.assessments[0]?.skillLevelId
        return [
          {
            name: maskPublicName(
              ended ? host.nameSnapshot : (placed?.nameSnapshot ?? clubPlayer.displayName),
            ),
            pictureUrl: pictureOf(clubPlayer),
            ...publicLevel(levelCodeFor(levelId ?? null)),
          },
        ]
      }),
      waitlist: waitlist.map((w) => {
        const clubPlayer = byId.get(w.clubPlayerId)
        return {
          name: maskPublicName(clubPlayer?.displayName ?? ''),
          pictureUrl: pictureOf(clubPlayer),
          ...publicLevel(levelCodeFor(w.skillLevelId)),
        }
      }),
      openSlots: Math.max(0, capacity - roster.length),
      slotBudget: capacity,
      acceptJoinRequests: session.acceptJoinRequests && TAKES_REQUESTS.includes(session.state),
      alwaysRequireRequest: session.alwaysRequireRequest,
      /** Record games (D-2026-11-20-02): false = "Not ranked"; results and match history as usual. */
      recordGames: session.recordGames,
      lastSyncedAt: session.updatedAt.getTime(),
      hasPendingChanges: streams.some((s) => s.highestReceivedSeq > s.contiguousSequence),
      results:
        session.state === 'completed'
          ? withResultPictures(
              await readPublishedResults(session.id, tx),
              roster.map((entry) => ({
                name: entry.nameSnapshot,
                pictureUrl: pictureOf(byId.get(entry.clubPlayerId)),
              })),
            )
          : null,
    }
  })
}

async function myRequestDto(request: {
  id: string
  name: string
  status: 'pending' | 'confirmed' | 'declined' | 'closed' | 'cancelled'
  placement: JoinRequestPlacement
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
  return {
    requestId: request.id,
    name: request.name,
    status: request.status,
    waitlistPosition,
    placement: request.placement,
  }
}

const PLACEMENTS: JoinRequestPlacement[] = ['slot', 'waitlist', 'from_waitlist']
const SLOTS_FULL = 'All slots are taken. Join the waitlist instead.'

/**
 * "Slots are full" for a player's request (D-2026-11-11-02): before start, with the live roster at
 * the slot budget. During play the Queue Master can admit additional players (#284–#287), so a slot
 * request stays possible.
 */
async function slotsFull(tx: Tx, session: QueueSession) {
  if (session.state === 'active') return false
  return (await liveRoster(tx, session.id)).length >= (await capacityOf(tx, session))
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
    statedBand: StatedBand
    /** Join a slot (default) or Be waitlisted (D-2026-11-11-02) */
    placement?: JoinRequestPlacement | null
  },
) {
  if (!UUID.test(input.requestId)) throw new ServiceError('invalid')
  const placement = input.placement ?? 'slot'
  if (placement !== 'slot' && placement !== 'waitlist')
    throw new ServiceError('invalid', { placement: 'Pick Join a slot or Be waitlisted.' })
  const name = input.name.trim()
  if (!name) throw new ServiceError('invalid', { name: 'Enter your name.' })
  if (!BANDS.includes(input.statedBand))
    throw new ServiceError('invalid', { statedBand: 'Choose a level.' })
  const session = await prisma.queueSession.findUnique({ where: { publicSlug: slug } })
  if (!session) throw new ServiceError('not_found')
  const receipt = receiptFor(input.requestId)
  try {
    const request = await prisma.$transaction(async (tx) => {
      const existing = await tx.sessionJoinRequest.findUnique({ where: { id: input.requestId } })
      if (existing) {
        if (existing.sessionId !== session.id || existing.name !== name)
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
      if (current?.state === 'active')
        throw new ServiceError('forbidden', { request: JOIN_REQUESTS_STARTED })
      if (!current || current.state !== 'prepared' || !current.accept)
        throw new ServiceError('forbidden', { request: 'This session is not taking requests.' })
      // D-2026-11-11-02: players cannot join a slot while every slot is taken; the waitlist remains.
      if (placement === 'slot' && (await slotsFull(tx, session)))
        throw new ServiceError('conflict', { placement: SLOTS_FULL })
      const pending = await tx.sessionJoinRequest.count({
        where: { sessionId: session.id, status: 'pending' },
      })
      if (pending >= MAX_PENDING_REQUESTS_PER_SESSION)
        throw new ServiceError('unavailable', {
          request: 'Too many requests are waiting. Try again later.',
        })
      return tx.sessionJoinRequest.create({
        data: {
          id: input.requestId,
          clubId: session.clubId,
          sessionId: session.id,
          name,
          nickname: input.nickname?.trim() || null,
          // A guest request carries no phone since D-2026-11-16-04 (reverses part of P08.9).
          phoneE164: null,
          statedBand: input.statedBand,
          placement,
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
 * P-JOIN-SESSION (#922): where a signed-in player already stands on a session, for the invite
 * landing. Read only; it never joins anyone.
 */
export async function readPlayerSessionStanding(playerId: string, sessionId: string) {
  const standing = await prisma.$transaction((tx) => playerStanding(tx, playerId, sessionId))
  return {
    inSession: standing.inSession,
    waitlistPosition: standing.waitlistPosition,
    requestPending: standing.joinRequest?.status === 'pending',
  }
}

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
    where: { sessionId, ...LIVE_ENTRY, clubPlayer: { playerId } },
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
  const waitIndex = waitlist.findIndex((w) => waiting.has(w.clubPlayerId))
  const inSession = !!roster || waitIndex >= 0
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
      placement: request.placement,
    }
  }
  return {
    name: player.fullName,
    // The session page's account bar (#693)
    nickname: player.nickname,
    rtrId: player.idAllocation?.rtrId ?? null,
    pictureUrl: player.avatarRef,
    inSession,
    // Join from waitlist (D-2026-11-11-02): the Player's own place while waitlisted
    waitlistPosition: !roster && waitIndex >= 0 ? waitIndex + 1 : null,
    waitlistClubPlayerId:
      !roster && waitIndex >= 0 ? (waitlist[waitIndex]?.clubPlayerId ?? null) : null,
    joinRequest,
  }
}

/**
 * Club member (D-2026-11-12-02, #764): the Player's current saved record in this club
 * (`club_players.player_id = player`, `removed_at IS NULL`) and its playing level, the latest club
 * assessment of that record. Null when the Player is not saved in the club, or the record has no
 * level yet (the Player then sends a request like a non-member, so the Queue Master sets the level).
 * Guests and unclaimed profiles have no `player_id`, so they are never members.
 */
async function memberOf(tx: Tx, clubId: string, playerId: string) {
  const clubPlayer = await tx.clubPlayer.findFirst({ where: { clubId, playerId, removedAt: null } })
  if (!clubPlayer) return null
  const level = await tx.clubAssessment.findFirst({
    where: { clubId, clubPlayerId: clubPlayer.id },
    orderBy: [{ assessedAt: 'desc' }, { id: 'desc' }],
    select: { skillLevelId: true },
  })
  return level ? { clubPlayer, skillLevelId: level.skillLevelId } : null
}

/**
 * The Player's level at the club (D-2026-11-19-12): on their current saved record, the level the
 * club gave outside a session or the latest session assessment, whichever is newer. Null when the
 * Player is not saved in the club or has no level there yet.
 */
async function clubLevelIdOf(tx: Tx, clubId: string, playerId: string) {
  const clubPlayer = await tx.clubPlayer.findFirst({
    where: { clubId, playerId, removedAt: null },
    select: {
      savedSkillLevelId: true,
      savedLevelAt: true,
      assessments: {
        orderBy: [{ assessedAt: 'desc' }, { id: 'desc' }],
        take: 1,
        select: { skillLevelId: true, assessedAt: true },
      },
    },
  })
  return clubPlayer ? savedLevelOf(clubPlayer) : null
}

/**
 * **Not open to your level** (D-2026-11-19-12) for a signed-in Player who holds no slot or waitlist
 * place on an upcoming session: the reason and their level at the club, or null when they may
 * request. A Player with no level at the club always may.
 */
async function playerLevelBlock(tx: Tx, sessionId: string, playerId: string) {
  const session = await tx.queueSession.findUnique({ where: { id: sessionId } })
  if (!session || session.state !== 'prepared' || session.levelRestriction === 'all') return null
  const skillLevelId = await clubLevelIdOf(tx, session.clubId, playerId)
  const level = levelCodeFor(skillLevelId)
  const reason = await levelRestrictionBlockIn(tx, session, skillLevelId)
  return reason && level ? { reason, level } : null
}

/** #569: authenticated Player only. Eligibility is the current roster link, never a browser ID. */
export async function readPlayerSessionAccess(context: PlayerContext, slug: string) {
  const session = await prisma.queueSession.findUnique({
    where: { publicSlug: slug },
    select: { id: true, clubId: true, state: true, publication: { select: { state: true } } },
  })
  if (!session || session.publication?.state === 'deleted') throw new ServiceError('not_found')
  return prisma.$transaction(async (tx) => {
    const roster = await liveRoster(tx, session.id)
    const linkedSelect = {
      id: true,
      playerId: true,
      nickname: true,
      avatarRef: true,
      sharedEntry: { select: { rtrId: true, claimedPlayerId: true, retiredAt: true } },
      player: {
        select: {
          avatarRef: true,
          nickname: true,
          profileState: true,
          profileVisibility: true,
          banner: { select: { id: true, image: true } },
          idAllocation: { select: { rtrId: true } },
        },
      },
    } as const
    const linked = await tx.clubPlayer.findMany({
      where: { id: { in: roster.map((entry) => entry.clubPlayerId) } },
      select: linkedSelect,
    })
    // Epic #1002 (#1006): the current hosts get the same name and card rule as the roster. They
    // never feed `fullRoster` below (a host who is not playing does not unlock the full roster).
    // A finished session: the rows frozen at its end, by their snapshot name (#1008).
    const ended = endedState(session.state)
    const hostRows = await tx.sessionHost.findMany({
      where: { sessionId: session.id, ...shownHostRows(session.state) },
      orderBy: [{ assignedAt: 'asc' }, { id: 'asc' }],
      select: { clubPlayerId: true, nameSnapshot: true },
    })
    const hostPlayers = await tx.clubPlayer.findMany({
      where: { id: { in: hostRows.map((h) => h.clubPlayerId) }, clubId: session.clubId },
      select: {
        ...linkedSelect,
        displayName: true,
        assessments: { orderBy: { assessedAt: 'desc' }, take: 1, select: { skillLevelId: true } },
      },
    })
    const shownBanners = await readShownProfileBanners(tx)
    const fullRoster = linked.some((entry) => entry.playerId === context.playerId)
    const pictures = new Map(
      [...linked, ...hostPlayers].map((entry) => [entry.id, pictureOf(entry)]),
    )
    const people = new Map([...linked, ...hostPlayers].map((entry) => [entry.id, entry]))
    /**
     * D-2026-11-09-02 for a signed-in Player, #731: a registered (claimed) player's full name,
     * nickname and RTR ID, and which card the tile opens; guests and unclaimed profiles stay
     * masked. An always-private player (D-2026-11-12-01) is masked for everyone but themselves,
     * keeps their picture and opens the private card.
     */
    const person = (entry: { clubPlayerId: string; nameSnapshot: string }) => {
      const club = people.get(entry.clubPlayerId)
      const registered = !!club?.playerId && club.player?.profileState === 'claimed'
      const isViewer = !!club?.playerId && club.playerId === context.playerId
      const alwaysPrivate = registered && club?.player?.profileVisibility === 'always_private'
      // D-2026-11-16-04: an unclaimed player (saved with an email, so an RTR ID) is public, with
      // this club's own name and nickname for them. Older records with no email stay masked.
      const shared = club?.sharedEntry
      const unclaimed = !registered && !!shared && !shared.claimedPlayerId && !shared.retiredAt
      const showFull = unclaimed || (registered && (!alwaysPrivate || isViewer))
      // The banner is public, like the picture: a registered (or always-private) player's own pick;
      // guests and unclaimed profiles draw the default Admin sets (D-2026-11-13-03), as in mock mode.
      const chosen = registered ? (club?.player?.banner ?? undefined) : undefined
      const banner = resolveProfileBanner(chosen?.id ?? null, () => chosen, shownBanners)
      return {
        bannerKey: banner.bannerKey,
        bannerImageUrl: banner.bannerImageUrl,
        name: showFull ? entry.nameSnapshot : maskPublicName(entry.nameSnapshot),
        masked: !showFull,
        nickname: unclaimed
          ? (club?.nickname ?? null)
          : showFull
            ? (club?.player?.nickname ?? null)
            : null,
        rtrId: unclaimed
          ? (shared?.rtrId ?? null)
          : showFull
            ? (club?.player?.idAllocation?.rtrId ?? null)
            : null,
        isViewer,
        profile: unclaimed
          ? ('unclaimed' as const)
          : showFull
            ? ('registered' as const)
            : alwaysPrivate
              ? ('private' as const)
              : ('guest' as const),
      }
    }
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
    // The participants this read returns (capped at 12 unless the Player is in the session); a
    // face points at its entry there so it can open the same profile card.
    const listed = fullRoster ? roster.length : Math.min(roster.length, 12)
    /** A face on a Courts now tile or a queued match: first name by the signed-in name rule. */
    const faceOf = (sessionPlayerId: string) => {
      const entry = byId.get(sessionPlayerId)
      const who = entry ? person(entry) : null
      const index = entry ? roster.indexOf(entry) : -1
      return {
        name: publicFirstName(who?.name ?? maskPublicName(entry?.nameSnapshot ?? '')),
        level: levelCodeFor(entry?.skillLevelId ?? null),
        pictureUrl: entry ? (pictures.get(entry.clubPlayerId) ?? null) : null,
        masked: who?.masked ?? true,
        isViewer: who?.isViewer ?? false,
        ...(index >= 0 && index < listed ? { participant: index } : {}),
      }
    }
    const team = (members: { team: string; sessionPlayerId: string }[], side: string) =>
      members.filter((member) => member.team === side).map((m) => faceOf(m.sessionPlayerId))
    // Courts now (the live feed): one entry per court, or per match on merged courts. Live
    // sessions only. Who is on which court and since when; never a score or a running result.
    const full = await tx.queueSession.findUniqueOrThrow({ where: { id: session.id } })
    const courtsNow: PublicCourtNow[] = []
    if (full.state === 'active' || full.state === 'finalizing') {
      const { ctx } = await matchContext(tx, full)
      const held = ctx.matches.filter(holdsCourt)
      const seen = new Set<string>()
      for (const court of ctx.courts) {
        if (seen.has(court.id)) continue
        const match = held.find((m) => m.courtIds.includes(court.id))
        if (!match) {
          courtsNow.push({
            id: court.id,
            label: court.label,
            courtLabels: [court.label],
            merged: false,
            status: 'free',
            teamA: [],
            teamB: [],
            startedAt: null,
            freeSince: courtFreeSince(court.id, ctx.matches) ?? full.startedAt?.getTime() ?? null,
          })
          continue
        }
        for (const id of match.courtIds) seen.add(id)
        courtsNow.push({
          id: court.id,
          label: courtNames(match, ctx.courts),
          courtLabels: ctx.courts.filter((c) => match.courtIds.includes(c.id)).map((c) => c.label),
          merged: match.courtIds.length > 1,
          status: match.state === 'active' ? 'playing' : 'getting-ready',
          teamA: match.teamA.map(faceOf),
          teamB: match.teamB.map(faceOf),
          startedAt: match.state === 'active' ? (match.startedAt ?? null) : null,
          freeSince: null,
        })
      }
    }
    const { waitlistClubPlayerId: _, ...standing } = await playerStanding(
      tx,
      context.playerId,
      session.id,
    )
    return {
      playerId: context.playerId,
      ...standing,
      // D-2026-11-12-02: whether the join card offers Join as NAME instead of a request
      isClubMember: !!(await memberOf(tx, session.clubId, context.playerId)),
      // D-2026-11-19-12: Not open to your level, while they hold no slot or waitlist place
      levelBlock: standing.inSession
        ? null
        : await playerLevelBlock(tx, session.id, context.playerId),
      fullRoster,
      participants: (fullRoster ? roster : roster.slice(0, 12)).map((entry) => ({
        ...person(entry),
        pictureUrl: pictures.get(entry.clubPlayerId) ?? null,
        ...publicLevel(levelCodeFor(entry.skillLevelId)),
      })),
      // Epic #1002 (#1006): the Hosts section, the same name, picture and card as Players.
      hosts: hostRows.flatMap((host) => {
        const who = hostPlayers.find((p) => p.id === host.clubPlayerId)
        if (!who) return []
        const placed = roster.find((r) => r.clubPlayerId === who.id)
        const nameSnapshot = ended ? host.nameSnapshot : (placed?.nameSnapshot ?? who.displayName)
        const levelId = placed?.skillLevelId ?? who.assessments[0]?.skillLevelId ?? null
        return [
          {
            ...person({ clubPlayerId: who.id, nameSnapshot }),
            pictureUrl: pictureOf(who),
            ...publicLevel(levelCodeFor(levelId)),
          },
        ]
      }),
      courtsNow,
      queue: matches.map((match) => ({
        matchNo: match.matchNo,
        format: match.format,
        teamA: team(match.participations, 'A'),
        teamB: team(match.participations, 'B'),
      })),
    }
  })
}

/**
 * Q-PUBLIC-JOIN › My night (D-2026-11-09-09) in real mode: the signed-in Player's own night in the
 * `MyNight` shape (`@rotra/data/public-session/types`), epoch-ms `startsAt`. Own standing only:
 * their status and stage, counted games, wins and losses, the minimum, the first waiting match with
 * them in it and the match holding a court with them in it (faces by the signed-in name rule, first
 * name only), their latest join request and open match request, club membership, and their own
 * I'm here / I'm leaving marks (`checkedIn`, `hasLeft`: the Queue Master's last action wins, like
 * the roster's mark), whether they have an open I can't make it notice (`cantMakeItSent`), whether
 * the Session invite is open to them (`canInvite`: confirmed or waitlisted, Prepared, join requests
 * on) and their existing invite code (`inviteCode`, null until they first open the card). Never
 * another player's results
 * or positions, presence of others, contacts or operator notes.
 */
export async function readMyNight(context: PlayerContext, slug: string) {
  const found = await prisma.queueSession.findUnique({
    where: { publicSlug: slug },
    select: { id: true, publication: { select: { state: true } } },
  })
  if (!found || found.publication?.state === 'deleted') throw new ServiceError('not_found')
  const night = await prisma.$transaction(async (tx) => {
    const session = await tx.queueSession.findUniqueOrThrow({ where: { id: found.id } })
    const { waitlistClubPlayerId: _, ...standing } = await playerStanding(
      tx,
      context.playerId,
      session.id,
    )
    const { ctx, roster } = await matchContext(tx, session)
    const own = await tx.sessionPlayer.findFirst({
      where: {
        sessionId: session.id,
        ...LIVE_ENTRY,
        clubPlayer: { playerId: context.playerId },
      },
      select: {
        id: true,
        present: true,
        presentChangedAt: true,
        selfCheckedInAt: true,
        leftAt: true,
      },
    })
    const row = own ? (ctx.roster.find((r) => r.id === own.id) ?? null) : null
    // The same rule as the roster's mark: a later presence change by the Queue Master hides it.
    const mark = own
      ? selfCheckInMark({
          present: own.present,
          presentChangedAt: own.presentChangedAt.getTime(),
          selfCheckedInAt: own.selfCheckedInAt?.getTime() ?? null,
          leftAt: own.leftAt?.getTime() ?? null,
        })
      : null
    const waitlisted = !row && standing.waitlistPosition !== null
    // Own drop-out notice and Session invite (D-2026-11-09-03, D-2026-11-09-08).
    const openNotice =
      !!row &&
      !!(await tx.sessionDropOutNotice.findFirst({
        where: { sessionPlayerId: row.id, status: 'open' },
        select: { id: true },
      }))
    const invite = await tx.sessionInviteCode.findUnique({
      where: { sessionId_playerId: { sessionId: session.id, playerId: context.playerId } },
      select: { code: true },
    })
    // Transfer my slot (#1011): the Player's own pending transfer, before Start only.
    const slotTransfer =
      row && session.state === 'prepared' ? await myPendingSlotTransfer(tx, row.id) : null
    const takesPart =
      session.state === 'prepared' || session.state === 'active' || session.state === 'finalizing'
    const isLive = session.state === 'active' || session.state === 'finalizing'
    const status = row ? 'confirmed' : waitlisted ? 'waitlisted' : 'none'
    let stage: MyNightStage | null = null
    if (status === 'waitlisted') stage = takesPart ? 'waitlisted' : null
    else if (row) {
      if (session.state === 'prepared') stage = 'before-start'
      else if (isLive) stage = row.present ? 'live-present' : 'live-not-present'
      else if (session.state === 'completed') stage = 'finished'
    }
    const people = row ? await peopleFor(tx, roster, context.playerId) : new Map()
    const levels = new Map(ctx.roster.map((r) => [r.id, r.level ?? null]))
    const face = (id: string) => {
      const person = people.get(id)
      return {
        name: publicFirstName(person?.name ?? ''),
        level: levels.get(id) ?? null,
        pictureUrl: person?.pictureUrl ?? null,
        masked: person?.masked ?? true,
        isViewer: person?.isViewer ?? false,
      }
    }
    const mine = (match: Match, rosterId: string) => {
      const mineA = match.teamA.includes(rosterId)
      const partners = (mineA ? match.teamA : match.teamB).filter((id) => id !== rosterId).map(face)
      const opponents = (mineA ? match.teamB : match.teamA).map(face)
      return {
        partners,
        opponents,
        matchLabel: myMatchLabel(
          partners.map((p) => p.name),
          opponents.map((p) => p.name),
        ),
      }
    }
    const result = row
      ? computeStandings(ctx.roster, ctx.matches).find((r) => r.playerId === row.id)
      : undefined
    const queued = row
      ? ctx.matches
          .filter((m) => m.state === 'waiting')
          .sort((a, b) => a.queuePosition - b.queuePosition)
      : []
    const queueIndex = row ? queued.findIndex((m) => [...m.teamA, ...m.teamB].includes(row.id)) : -1
    const queuedMatch = queued[queueIndex]
    const held =
      row && isLive
        ? ctx.matches.find((m) => holdsCourt(m) && [...m.teamA, ...m.teamB].includes(row.id))
        : undefined
    return {
      playerId: context.playerId,
      status,
      stage,
      waitlistPosition: standing.waitlistPosition,
      startsAt: session.scheduledStartAt.getTime(),
      present: row?.present ?? false,
      checkedIn: mark?.kind === 'checked-in',
      hasLeft: mark?.kind === 'left',
      cantMakeItSent: openNotice,
      canTransfer: !!row && session.state === 'prepared',
      slotTransfer,
      offline: false,
      games: result?.games ?? 0,
      won: result?.wins ?? 0,
      lost: result?.losses ?? 0,
      minimum: session.minimumGames,
      inQueue:
        row && queuedMatch ? { position: queueIndex + 1, ...mine(queuedMatch, row.id) } : null,
      onCourt:
        row && held
          ? {
              courtLabel: courtNames(held, ctx.courts),
              started: held.state === 'active',
              ...mine(held, row.id),
            }
          : null,
      joinRequest: standing.joinRequest,
      isClubMember: !!(await memberOf(tx, session.clubId, context.playerId)),
      levelBlock: standing.inSession
        ? null
        : await playerLevelBlock(tx, session.id, context.playerId),
      canInvite:
        session.state === 'prepared' && session.acceptJoinRequests && (!!row || waitlisted),
      inviteCode: invite?.code ?? null,
    }
  })
  const { matchRequest } = await readMyMatchRequest(context, slug)
  return { ...night, matchRequest }
}

/**
 * Q-PUBLIC-JOIN › Match history (2026-11-13 finished session and match history courts logs) in real
 * mode: a finished session's matches for the signed-in Player, in the `PublicMatchHistory` shape
 * (`@rotra/data/public-session/types`), epoch-ms times, newest first, with the replay's courts and
 * bounds. `null` for any session that is not completed; a session with Record games off lists its
 * matches as usual (D-2026-11-20-02). Publication gate (results module ›
 * Publishing): until the club shares the results (a `published` publication with a public copy)
 * only the matches the Player played in are listed and `courtLabels` is empty; `total` always
 * counts every finished or invalid match. Faces follow the signed-in name rule, first name only;
 * `participant` is the face's index in the access read's roster (confirmation order), sent only
 * while the Player is on the live roster (the access read's full roster). Never player IDs,
 * contacts, presence, operator notes or waiting matches.
 */
export async function readPublicMatchHistory(
  context: PlayerContext,
  slug: string,
): Promise<PublicMatchHistory | null> {
  const found = await prisma.queueSession.findUnique({
    where: { publicSlug: slug },
    select: { id: true, publication: { select: { state: true } } },
  })
  if (!found || found.publication?.state === 'deleted') throw new ServiceError('not_found')
  return prisma.$transaction(async (tx) => {
    const session = await tx.queueSession.findUniqueOrThrow({ where: { id: found.id } })
    if (session.state !== 'completed') return null
    const { ctx, roster: live } = await matchContext(tx, session)
    // Every entry, released and no show too, so a player who played and then left keeps their face.
    const [entries, courts] = await Promise.all([
      tx.sessionPlayer.findMany({
        where: { sessionId: session.id },
        orderBy: [{ confirmedAt: 'asc' }, { id: 'asc' }],
      }),
      // Removed courts too: a match played on a court removed later keeps its label.
      tx.sessionCourt.findMany({ where: { sessionId: session.id }, orderBy: COURT_ORDER }),
    ])
    const record = sessionRecordHistory({
      fallbackStart: (session.startedAt ?? session.scheduledStartAt).getTime(),
      courts: courts.map(
        (c): CourtView => ({
          id: c.id,
          sessionId: c.sessionId,
          label: c.label,
          position: c.position,
          startsAt: c.startsAt?.getTime(),
          openedEarlyAt: c.openedEarlyAt?.getTime() ?? null,
          openUntil: c.openUntil?.getTime() ?? null,
          removedAt: c.removedAt?.getTime() ?? null,
        }),
      ),
      roster: entries.map(
        (r): RosterView => ({
          id: r.id,
          sessionId: r.sessionId,
          clubPlayerId: r.clubPlayerId,
          nameSnapshot: r.nameSnapshot,
          nicknameSnapshot: null,
          present: r.present,
          presentChangedAt: r.presentChangedAt.getTime(),
          level: levelCodeFor(r.skillLevelId),
          levelLockedAt: r.levelLockedAt?.getTime() ?? null,
          confirmedAt: r.confirmedAt.getTime(),
        }),
      ),
      matches: ctx.matches,
    })
    const people = await peopleFor(tx, entries, context.playerId)
    const levels = new Map(entries.map((r) => [r.id, levelCodeFor(r.skillLevelId)]))
    // The access read sends the full roster only while the Player is on the live roster.
    const fullRoster = live.some((entry) => people.get(entry.id)?.isViewer)
    const indexes = new Map(live.map((entry, index) => [entry.id, index]))
    const face = (id: string): PublicMatchPlayer => {
      const person = people.get(id)
      const participant = fullRoster ? indexes.get(id) : undefined
      return {
        name: publicFirstName(person?.name ?? ''),
        level: levels.get(id) ?? null,
        pictureUrl: person?.pictureUrl ?? null,
        masked: person?.masked ?? true,
        isViewer: person?.isViewer ?? false,
        ...(participant !== undefined ? { participant } : {}),
      }
    }
    const formats = new Map(ctx.matches.map((m) => [m.id, m.format]))
    const all = record.matches
      .map(
        (m): PublicHistoryMatch => ({
          id: m.id,
          number: m.number,
          format: formats.get(m.id) ?? 'doubles',
          courtLabels: m.courtLabels,
          startedAt: m.startedAt,
          endedAt: m.endedAt,
          replayEndAt: m.replayEndAt,
          teamA: m.teamA.map((p) => face(p.id)),
          teamB: m.teamB.map((p) => face(p.id)),
          winningTeam: m.winningTeam,
          teamAScore: m.teamAScore,
          teamBScore: m.teamBScore,
          invalid: m.invalid,
        }),
      )
      .sort((a, b) => b.number - a.number)
    const shared = (await readPublishedResults(session.id, tx)) !== null
    return {
      shared,
      total: all.length,
      matches: shared
        ? all
        : all.filter((m) => [...m.teamA, ...m.teamB].some((p) => p.isViewer === true)),
      courtLabels: shared ? record.courtLabels : [],
      from: record.from,
      to: record.to,
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
 *
 * **Join as NAME** (D-2026-11-12-02, #764): a club member on a prepared session, while Accept join
 * requests is on and Always require a request is off, is placed right away through the confirm
 * path's placement (`placeClubMember`): a `session_players` row with their saved level (not
 * present), or a `session_waitlist` row at the end when they chose Be waitlisted or every slot is
 * taken. No `session_join_requests` row; the session revision bumps like any roster change.
 * Replies `{ requestId: null, clubPlayerId, message }` with “You're in” / “You're on the waitlist”.
 */
export async function joinSessionAsPlayer(
  context: PlayerContext,
  slug: string,
  input: { placement?: JoinRequestPlacement | null } = {},
) {
  const session = await prisma.queueSession.findUnique({ where: { publicSlug: slug } })
  if (!session) throw new ServiceError('not_found')
  const placement = input.placement ?? 'slot'
  if (!PLACEMENTS.includes(placement))
    throw new ServiceError('invalid', { placement: 'Pick Join a slot or Be waitlisted.' })
  const requestId = crypto.randomUUID()
  let joined: { clubPlayerId: string; waitlisted: boolean } | null = null
  try {
    await prisma.$transaction(async (tx) => {
      const current = await lockSession(tx, { clubId: session.clubId }, session.id)
      if (current.state === 'cancelled')
        throw new ServiceError('forbidden', { request: 'This session is cancelled.' })
      if (current.state === 'active')
        throw new ServiceError('forbidden', { request: JOIN_REQUESTS_STARTED })
      if (current.state !== 'prepared' || !current.acceptJoinRequests)
        throw new ServiceError('forbidden', { request: 'This session is not taking requests.' })
      const standing = await playerStanding(tx, context.playerId, session.id)
      if (standing.joinRequest?.status === 'pending')
        throw new ServiceError('conflict', { request: 'Your request is already sent.' })
      // D-2026-11-19-12: a Player whose level here is outside the restriction, or whose band's
      // slots are full, can't request or join. A waitlisted Player's Join from waitlist isn't checked.
      if (placement !== 'from_waitlist' && !standing.inSession) {
        const blocked = await levelRestrictionBlockIn(
          tx,
          current,
          await clubLevelIdOf(tx, session.clubId, context.playerId),
        )
        if (blocked) throw new ServiceError('forbidden', { request: blocked })
      }
      const full = await slotsFull(tx, current)
      // D-2026-11-12-02: a club member joins right away (Join from waitlist stays a request).
      const member =
        placement !== 'from_waitlist' && !current.alwaysRequireRequest
          ? await memberOf(tx, session.clubId, context.playerId)
          : null
      if (member) {
        if (standing.inSession)
          throw new ServiceError('conflict', { request: "You're already in this session." })
        const asClub: ClubContext = {
          kind: 'club',
          subject: context.subject,
          clubId: session.clubId,
        }
        const placed = await placeClubMember(
          tx,
          asClub,
          current,
          member.clubPlayer,
          member.skillLevelId,
          requestId,
          new Date(),
          placement === 'waitlist' || full,
        )
        await recomputeMinimum(tx, await touchSession(tx, current))
        joined = { clubPlayerId: member.clubPlayer.id, waitlisted: !!placed.waitlist }
        return
      }
      // D-2026-11-11-02: Join from waitlist, only for a waitlisted Player while a slot is open.
      if (placement === 'from_waitlist') {
        if (!standing.waitlistClubPlayerId)
          throw new ServiceError(standing.inSession ? 'conflict' : 'forbidden', {
            request: standing.inSession
              ? "You're already in this session."
              : 'Only waitlisted players can ask to join from the waitlist.',
          })
        if (full)
          throw new ServiceError('conflict', {
            request: 'All slots are taken. You keep your place on the waitlist.',
          })
      } else if (standing.inSession)
        throw new ServiceError('conflict', { request: "You're already in this session." })
      // D-2026-11-11-02: players cannot join a slot while every slot is taken; the waitlist remains.
      else if (placement === 'slot' && full)
        throw new ServiceError('conflict', { placement: SLOTS_FULL })
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
          placement,
          // A request from the waitlist already knows the waitlisted club player.
          clubPlayerId: placement === 'from_waitlist' ? standing.waitlistClubPlayerId : null,
          requestedAt: new Date(),
        },
      })
    })
  } catch (error) {
    if ((error as { code?: string })?.code === 'P2002')
      throw new ServiceError('conflict', { request: 'Your request is already sent.' })
    throw error
  }
  // The transaction callback assigned it, which TypeScript's narrowing does not track.
  const done = joined as { clubPlayerId: string; waitlisted: boolean } | null
  if (done)
    return {
      requestId: null,
      clubPlayerId: done.clubPlayerId,
      message: done.waitlisted ? "You're on the waitlist" : "You're in",
    }
  return { requestId, message: placement === 'from_waitlist' ? 'Slot requested' : 'Request sent' }
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

/**
 * Q-PUBLIC-JOIN · **Move me to the waitlist** (#735): the signed-in Player's own roster entry in
 * this session steps down to the front of the waitlist, before the start or during play, with the
 * same rules as the Queue Master's Move to waitlist (one locked transaction, released entry, level
 * and paid mark kept). Refused (409) while they are in a waiting, On court or Playing match.
 * Repeat-safe on `operationId`.
 */
export async function movePlayerToWaitlist(
  context: PlayerContext,
  slug: string,
  input: { operationId: string },
) {
  if (!input.operationId)
    throw new ServiceError('invalid', { operationId: 'Missing operation id.' })
  const found = await prisma.queueSession.findUnique({
    where: { publicSlug: slug },
    select: { id: true, clubId: true },
  })
  if (!found) throw new ServiceError('not_found')
  try {
    return await prisma.$transaction(async (tx) => {
      const session = await lockSession(tx, found, found.id)
      requireState(session, ['prepared', 'active'], 'This session has finished.')
      const done = await tx.sessionWaitlistEntry.findUnique({
        where: { id: await derivedId(input.operationId, 'step-down') },
        select: { clubPlayerId: true },
      })
      if (done) return { clubPlayerId: done.clubPlayerId, message: 'You moved to the waitlist' }
      const entry = await tx.sessionPlayer.findFirst({
        where: {
          sessionId: session.id,
          ...LIVE_ENTRY,
          clubPlayer: { playerId: context.playerId },
        },
        select: { id: true },
      })
      if (!entry)
        throw new ServiceError('invalid', {
          player: 'Only confirmed players in this session can do this.',
        })
      const moved = await stepDownIn(
        tx,
        session,
        { operationId: input.operationId, rosterId: entry.id },
        () => "You're in a match. Ask the Queue Master to finish or remove it first.",
      )
      await closeStaleMatchRequests(tx, session.id)
      await recomputeMinimum(tx, await touchSession(tx, session))
      return { clubPlayerId: moved.clubPlayerId, message: 'You moved to the waitlist' }
    })
  } catch (error) {
    mapDatabaseError(error)
  }
}

/** The signed-in Player's own live roster entry in a session found by its public link. */
async function ownEntry(tx: Tx, sessionId: string, playerId: string) {
  const entry = await tx.sessionPlayer.findFirst({
    where: { sessionId, ...LIVE_ENTRY, clubPlayer: { playerId } },
    select: { id: true, present: true },
  })
  if (!entry)
    throw new ServiceError('invalid', {
      player: 'Only confirmed players in this session can do this.',
    })
  return entry
}

/**
 * Q-PUBLIC-JOIN · **I'm here** (D-2026-11-09-03) from the Queue session page, live sessions only:
 * the signed-in Player's own roster entry becomes Present with the “checked in themselves” mark
 * (`self_checked_in_at` = `present_changed_at`). Refused while the club has self check-in off, and
 * for anyone without a live entry in this session. A check-in after the Queue Master turned Present
 * off is a new check-in with a new mark; a tap while already present is a 409 that changes nothing.
 * A tap only: no location and no venue QR.
 */
export async function selfCheckIn(context: PlayerContext, slug: string) {
  const found = await prisma.queueSession.findUnique({
    where: { publicSlug: slug },
    select: { id: true, clubId: true },
  })
  if (!found) throw new ServiceError('not_found')
  try {
    return await prisma.$transaction(async (tx) => {
      const session = await lockSession(tx, found, found.id)
      requireState(session, ['active'], 'Check-in opens when the session starts.')
      const club = await tx.club.findUniqueOrThrow({
        where: { id: session.clubId },
        select: { selfCheckInEnabled: true },
      })
      if (!club.selfCheckInEnabled)
        throw new ServiceError('invalid', { player: 'Your club has turned self check-in off.' })
      const entry = await ownEntry(tx, session.id, context.playerId)
      if (entry.present)
        throw new ServiceError('conflict', { player: "You're already marked present." })
      const now = new Date()
      await tx.sessionPlayer.update({
        where: { id: entry.id },
        data: {
          present: true,
          presentChangedAt: now,
          selfCheckedInAt: now,
          revision: { increment: 1 },
        },
      })
      await touchSession(tx, session)
      return { rosterId: entry.id, message: 'Checked in' }
    })
  } catch (error) {
    mapDatabaseError(error)
  }
}

/**
 * Q-PUBLIC-JOIN · **I'm leaving** (D-2026-11-09-03), live sessions only: the signed-in Player's own
 * entry turns Present off with the “Left” mark (`left_at` = `present_changed_at`), and every open
 * match request that names them closes. Never releases the slot, and never ends a match they are
 * in. Allowed with self check-in off: it only tells the Queue Master.
 */
export async function leaveSessionAsPlayer(context: PlayerContext, slug: string) {
  const found = await prisma.queueSession.findUnique({
    where: { publicSlug: slug },
    select: { id: true, clubId: true },
  })
  if (!found) throw new ServiceError('not_found')
  try {
    return await prisma.$transaction(async (tx) => {
      const session = await lockSession(tx, found, found.id)
      requireState(session, ['active'], 'Only a live session can be left.')
      const entry = await ownEntry(tx, session.id, context.playerId)
      if (!entry.present)
        throw new ServiceError('conflict', { player: "You're not marked present." })
      const now = new Date()
      await tx.sessionPlayer.update({
        where: { id: entry.id },
        data: { present: false, presentChangedAt: now, leftAt: now, revision: { increment: 1 } },
      })
      await closeStaleMatchRequests(tx, session.id, now)
      await touchSession(tx, session)
      return { rosterId: entry.id, message: "Told the QM you're leaving" }
    })
  } catch (error) {
    mapDatabaseError(error)
  }
}

/**
 * Q-PUBLIC-JOIN · **I can't make it** (D-2026-11-09-03) from the Queue session page, before the
 * start only: the signed-in Player's own roster entry gets an open drop-out notice for the Queue
 * Master. The slot stays until the Queue Master acts (Keep or Remove from roster, in Requests).
 * 409 when the Player already has an open notice; refused for anyone without a live entry in this
 * session and once the session has started.
 */
export async function sendDropOutNotice(context: PlayerContext, slug: string) {
  const found = await prisma.queueSession.findUnique({
    where: { publicSlug: slug },
    select: { id: true, clubId: true },
  })
  if (!found) throw new ServiceError('not_found')
  try {
    return await prisma.$transaction(async (tx) => {
      const session = await lockSession(tx, found, found.id)
      if (session.state !== 'prepared')
        throw new ServiceError('invalid', { state: 'The session has already started.' })
      const entry = await ownEntry(tx, session.id, context.playerId)
      const open = await tx.sessionDropOutNotice.findFirst({
        where: { sessionPlayerId: entry.id, status: 'open' },
        select: { id: true },
      })
      if (open) throw new ServiceError('conflict', { player: "Told the QM you can't make it" })
      const notice = await tx.sessionDropOutNotice.create({
        data: {
          id: crypto.randomUUID(),
          clubId: session.clubId,
          sessionId: session.id,
          sessionPlayerId: entry.id,
          playerId: context.playerId,
        },
        select: { id: true },
      })
      await touchSession(tx, session)
      return { noticeId: notice.id, message: "Told the QM you can't make it" }
    })
  } catch (error) {
    if (error instanceof ServiceError) throw error
    mapDatabaseError(error)
  }
}

/**
 * Session invite (D-2026-11-09-08): the signed-in Player's code for this session, made the first
 * time and the same on every later call. Only a confirmed or waitlisted Player, only while the
 * session is Prepared and takes join requests. The code is short and random, never the RTR ID; a
 * collision (or a parallel first call) is retried, each try in its own transaction.
 */
export async function getSessionInviteCode(context: PlayerContext, slug: string) {
  const found = await prisma.queueSession.findUnique({
    where: { publicSlug: slug },
    select: { id: true, clubId: true },
  })
  if (!found) throw new ServiceError('not_found')
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await prisma.$transaction(async (tx) => {
        const session = await tx.queueSession.findUniqueOrThrow({ where: { id: found.id } })
        if (session.state !== 'prepared')
          throw new ServiceError('invalid', { state: 'Invites close when the session starts.' })
        if (!session.acceptJoinRequests)
          throw new ServiceError('invalid', { state: 'This session is not taking requests.' })
        const [entry, waiting] = await Promise.all([
          tx.sessionPlayer.findFirst({
            where: {
              sessionId: session.id,
              ...LIVE_ENTRY,
              clubPlayer: { playerId: context.playerId },
            },
            select: { id: true },
          }),
          tx.sessionWaitlistEntry.findFirst({
            where: { sessionId: session.id, clubPlayer: { playerId: context.playerId } },
            select: { id: true },
          }),
        ])
        if (!entry && !waiting)
          throw new ServiceError('invalid', {
            player: 'Only confirmed or waitlisted players can invite.',
          })
        const saved = await tx.sessionInviteCode.findUnique({
          where: { sessionId_playerId: { sessionId: session.id, playerId: context.playerId } },
          select: { code: true },
        })
        if (saved) return { code: saved.code }
        const created = await tx.sessionInviteCode.create({
          data: {
            id: crypto.randomUUID(),
            clubId: session.clubId,
            sessionId: session.id,
            playerId: context.playerId,
            code: makeInviteCode(),
          },
          select: { code: true },
        })
        return { code: created.code }
      })
    } catch (error) {
      if (error instanceof ServiceError) throw error
      // A taken code or a parallel first call: try again (the retry reads the saved code).
      const failure = error as {
        code?: string
        meta?: { code?: string }
        cause?: { code?: string }
      }
      if (failure?.code === 'P2002' || (failure?.meta?.code ?? failure?.cause?.code) === '23505')
        continue
      mapDatabaseError(error)
    }
  }
  throw new ServiceError('conflict')
}
