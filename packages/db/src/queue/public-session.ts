import 'server-only'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { computeStandings, courtNames, holdsCourt } from '@rotra/data/match/match.rules'
import type { Match } from '@rotra/data/match/types'
import { resolveProfileBanner } from '@rotra/data/profile-banner/rules'
import {
  maskPublicName,
  myMatchLabel,
  publicFirstName,
  publicLevel,
  publicSkillMix,
} from '@rotra/data/public-session/rules'
import type { MyNightStage } from '@rotra/data/public-session/types'
import { readShownProfileBanners } from '../admin/profile-banners'
import { type ClubContext, loadAccountContext, type PlayerContext } from '../auth/account-context'
import { MOCK_COOKIE_PREFIX } from '../auth/data-mode'
import { type CookieAdapter, verifySubject } from '../auth/supabase'
import { prisma } from '../client/prisma'
import type { JoinRequestPlacement, QueueSession, StatedBand } from '../generated/prisma/client'
import { ServiceError } from '../service/errors'
import { closeStaleMatchRequests } from './match-request-store'
import { peopleFor, readMyMatchRequest } from './match-requests'
import { matchContext } from './match-store'
import { readPublishedResults } from './results'
import { placeClubMember, stepDownIn } from './session-roster'
import {
  capacityOf,
  derivedId,
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

const E164 = /^\+[1-9][0-9]{7,14}$/
const BANDS: StatedBand[] = ['beginner', 'intermediate', 'advanced', 'unsure']
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Every prepared or live session takes requests while the club has them on (players module). */
const TAKES_REQUESTS = ['prepared', 'active']
/** Join requests end at Start (D-2026-11-11-11): none is created once the session is live. */
const JOIN_REQUESTS_STARTED = 'The session has started, so online join requests are closed.'

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
      alwaysRequireRequest: session.alwaysRequireRequest,
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
    phone?: string | null
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

/** #569: authenticated Player only. Eligibility is the current roster link, never a browser ID. */
export async function readPlayerSessionAccess(context: PlayerContext, slug: string) {
  const session = await prisma.queueSession.findUnique({
    where: { publicSlug: slug },
    select: { id: true, clubId: true, publication: { select: { state: true } } },
  })
  if (!session || session.publication?.state === 'deleted') throw new ServiceError('not_found')
  return prisma.$transaction(async (tx) => {
    const roster = await liveRoster(tx, session.id)
    const linked = await tx.clubPlayer.findMany({
      where: { id: { in: roster.map((entry) => entry.clubPlayerId) } },
      select: {
        id: true,
        playerId: true,
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
      },
    })
    const shownBanners = await readShownProfileBanners(tx)
    const fullRoster = linked.some((entry) => entry.playerId === context.playerId)
    const pictures = new Map(linked.map((entry) => [entry.id, entry.player?.avatarRef ?? null]))
    const people = new Map(linked.map((entry) => [entry.id, entry]))
    /**
     * D-2026-11-09-02 for a signed-in Player, #731: a registered (claimed) player's full name,
     * nickname and RTR ID, and which card the tile opens; guests and unclaimed profiles stay
     * masked. An always-private player (D-2026-11-12-01) is masked for everyone but themselves,
     * keeps their picture and opens the private card.
     */
    const person = (entry: (typeof roster)[number]) => {
      const club = people.get(entry.clubPlayerId)
      const registered = !!club?.playerId && club.player?.profileState === 'claimed'
      const isViewer = !!club?.playerId && club.playerId === context.playerId
      const alwaysPrivate = registered && club?.player?.profileVisibility === 'always_private'
      const showFull = registered && (!alwaysPrivate || isViewer)
      // The banner is public, like the picture: registered and always-private players only.
      const chosen = club?.player?.banner ?? undefined
      const banner = registered
        ? resolveProfileBanner(chosen?.id ?? null, () => chosen, shownBanners)
        : null
      return {
        bannerKey: banner?.bannerKey ?? null,
        bannerImageUrl: banner?.bannerImageUrl ?? null,
        name: showFull ? entry.nameSnapshot : maskPublicName(entry.nameSnapshot),
        masked: !showFull,
        nickname: showFull ? (club?.player?.nickname ?? null) : null,
        rtrId: showFull ? (club?.player?.idAllocation?.rtrId ?? null) : null,
        isViewer,
        profile: showFull
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
      fullRoster,
      participants: (fullRoster ? roster : roster.slice(0, 12)).map((entry) => ({
        ...person(entry),
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

/**
 * Q-PUBLIC-JOIN › My night (D-2026-11-09-09) in real mode: the signed-in Player's own night in the
 * `MyNight` shape (`@rotra/data/public-session/types`), epoch-ms `startsAt`. Own standing only:
 * their status and stage, counted games, wins and losses, the minimum, the first waiting match with
 * them in it and the match holding a court with them in it (faces by the signed-in name rule, first
 * name only), their latest join request and open match request, and club membership. Self check-in
 * marks, drop-out notices and Session invites are not real yet, so `checkedIn`, `hasLeft`,
 * `cantMakeItSent` and `canInvite` read false and `inviteCode` null. Never another player's results
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
        releasedAt: null,
        clubPlayer: { playerId: context.playerId },
      },
      select: { id: true },
    })
    const row = own ? (ctx.roster.find((r) => r.id === own.id) ?? null) : null
    const waitlisted = !row && standing.waitlistPosition !== null
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
      checkedIn: false,
      hasLeft: false,
      cantMakeItSent: false,
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
      canInvite: false,
      inviteCode: null,
    }
  })
  const { matchRequest } = await readMyMatchRequest(context, slug)
  return { ...night, matchRequest }
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
          releasedAt: null,
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
