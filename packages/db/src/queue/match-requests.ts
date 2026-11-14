import 'server-only'
import {
  countedGames,
  courtNames,
  FORMAT_LABELS,
  holdsCourt,
  waitMinutes,
} from '@rotra/data/match/match.rules'
import type { MatchFormat } from '@rotra/data/match/types'
import {
  allowedRequestFormats,
  FORMAT_NOT_ALLOWED_TEXT,
  NO_MATCH_REQUESTS_TEXT,
  notEnoughToFillText,
  REQUEST_FORMAT_ORDER,
  requestLineup,
  requestSpots,
} from '@rotra/data/match-request/rules'
import { maskPublicName, publicFirstName } from '@rotra/data/public-session/rules'
import type { ClubContext, PlayerContext } from '../auth/account-context'
import { prisma } from '../client/prisma'
import type { QueueSession } from '../generated/prisma/client'
import { requireOwnPlayer } from '../service/authorize'
import { ServiceError } from '../service/errors'
import { toIso } from '../service/serialize'
import { requestFormatsRecord } from './dto'
import {
  type AutoFillOptions,
  type AutoPlaced,
  autoFillCourts,
  withAutoPlaced,
} from './match-control'
import { appendMatch } from './match-queue'
import {
  closeStaleMatchRequests,
  liveOpenRequests,
  MATCH_REQUEST_INCLUDE,
  type MatchRequestRow,
  presentIds,
  requestShape,
} from './match-request-store'
import { loadMatch, type MatchRow, matchCommand, matchContext, matchDto } from './match-store'
import {
  derivedId,
  LIVE_ENTRY,
  levelCodeFor,
  liveRoster,
  lockSession,
  mapDatabaseError,
  requireSessionAccess,
  type Tx,
} from './session-store'

/**
 * Match requests in real mode (D-2026-11-09-05, Q17.14 and Q18.12), the same rules as the mock
 * (`@rotra/data/match-request/fetchers`, `@rotra/data/match/matchRequestDecisions`):
 *
 * - A present, signed-in, confirmed Player in a live session sends one open request: a format the
 *   session's Players can request allows, partners and opponents (null = Anyone). They can cancel it.
 * - The Queue Master reads it in Requests › Match and either adds it (a protected waiting match at
 *   the end of the Main Queue, Anyone spots filled by `requestLineup`, then Auto Queue like any add)
 *   or declines it.
 * - It closes by itself when anyone named stops being present (`closeStaleMatchRequests`, run after
 *   every roster change) or when the session finishes or is marked invalid.
 *
 * Player commands identify the Player by the account context only; the roster link proves they are
 * in the session. Replies carry allowlisted fields only.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ALREADY_CLOSED = 'This match request is already closed.'

/** The fields `allowedRequestFormats` reads, from the stored session. */
const formatsView = (session: QueueSession) => ({
  allowSingles: session.allowSingles,
  allowDoubles: session.allowDoubles,
  requestFormats: requestFormatsRecord(session.requestFormats),
})

/** Finished, invalid and cancelled sessions take no requests (shared rule `sessionTakesRequests`). */
const takesRequests = (session: QueueSession) =>
  session.state === 'prepared' || session.state === 'active' || session.state === 'finalizing'

/** A session page's session by slug; a removed page is not found, like the public read. */
async function sessionBySlug(slug: string) {
  const session = await prisma.queueSession.findUnique({
    where: { publicSlug: slug },
    select: { id: true, clubId: true, publication: { select: { state: true } } },
  })
  if (!session || session.publication?.state === 'deleted') throw new ServiceError('not_found')
  return session
}

/** The signed-in Player's live roster entry in the session, or null. */
function ownEntry(tx: Tx, sessionId: string, playerId: string) {
  return tx.sessionPlayer.findFirst({
    where: { sessionId, ...LIVE_ENTRY, clubPlayer: { playerId } },
  })
}

/**
 * The signed-in name rule (D-2026-11-09-02, #731), as the Player access read applies it: a
 * registered (claimed) player's full name and nickname, guests and unclaimed profiles masked, an
 * always-private player masked for everyone but themselves. Pictures stay public.
 */
export async function peopleFor(
  tx: Tx,
  roster: { id: string; clubPlayerId: string; nameSnapshot: string }[],
  viewerPlayerId: string,
) {
  const linked = await tx.clubPlayer.findMany({
    where: { id: { in: roster.map((r) => r.clubPlayerId) } },
    select: {
      id: true,
      playerId: true,
      player: {
        select: { avatarRef: true, nickname: true, profileState: true, profileVisibility: true },
      },
    },
  })
  const byClubPlayer = new Map(linked.map((c) => [c.id, c]))
  return new Map(
    roster.map((entry) => {
      const club = byClubPlayer.get(entry.clubPlayerId)
      const registered = !!club?.playerId && club.player?.profileState === 'claimed'
      const isViewer = !!club?.playerId && club.playerId === viewerPlayerId
      const alwaysPrivate = registered && club?.player?.profileVisibility === 'always_private'
      const showFull = registered && (!alwaysPrivate || isViewer)
      return [
        entry.id,
        {
          name: showFull ? entry.nameSnapshot : maskPublicName(entry.nameSnapshot),
          masked: !showFull,
          nickname: showFull ? (club?.player?.nickname ?? null) : null,
          pictureUrl: club?.player?.avatarRef ?? null,
          isViewer,
        },
      ] as const
    }),
  )
}

// ---------- Player side (Q17.14), on the Player origin ----------

type SendInput = { requestId: string; format: unknown; partners: unknown; opponents: unknown }

/** A spot list from a request body: roster ids or null (Anyone); anything else is `invalid`. */
function spotsOf(value: unknown, field: string): (string | null)[] {
  if (value === undefined) return []
  if (
    !Array.isArray(value) ||
    value.some((id) => id !== null && (typeof id !== 'string' || !UUID.test(id)))
  )
    throw new ServiceError('invalid', { [field]: 'Pick players from this session.' })
  return value as (string | null)[]
}

/**
 * **Send request** (D-2026-11-09-05). Repeat-safe on the client's `requestId`: a retry returns the
 * same request. Refusals carry their toast text in `fields`: “Match requests open when the session
 * starts.”, “This session isn't taking match requests”, “Not allowed for requests in this
 * session”, “Only confirmed players in this session can do this.”, “Check in first to request a
 * match.”, 409 “Match request sent · the QM decides” (one open request per player), “Too many
 * players for this format.”, 409 “Pick each player once.”, 409 “Present players only. Pick again.”
 */
export async function sendMatchRequest(context: PlayerContext, slug: string, input: SendInput) {
  requireOwnPlayer(context, context.playerId)
  if (!UUID.test(input.requestId))
    throw new ServiceError('invalid', { requestId: 'Missing request id.' })
  const format = input.format as MatchFormat
  if (!REQUEST_FORMAT_ORDER.includes(format))
    throw new ServiceError('invalid', { format: FORMAT_NOT_ALLOWED_TEXT })
  const partnersIn = spotsOf(input.partners, 'partners')
  const opponentsIn = spotsOf(input.opponents, 'opponents')
  const found = await sessionBySlug(slug)
  try {
    return await prisma.$transaction(async (tx) => {
      const session = await lockSession(tx, found, found.id)
      const done = await tx.sessionMatchRequest.findUnique({
        where: { id: input.requestId },
        include: { requester: { select: { clubPlayer: { select: { playerId: true } } } } },
      })
      if (done) {
        if (
          done.sessionId !== session.id ||
          done.requester.clubPlayer.playerId !== context.playerId
        )
          throw new ServiceError('conflict')
        return { matchRequestId: done.id, message: 'Match request sent' }
      }
      if (session.state !== 'active')
        throw new ServiceError('invalid', {
          request: 'Match requests open when the session starts.',
        })
      const allowed = allowedRequestFormats(formatsView(session))
      if (!allowed.length) throw new ServiceError('invalid', { request: NO_MATCH_REQUESTS_TEXT })
      if (!allowed.includes(format))
        throw new ServiceError('invalid', { format: FORMAT_NOT_ALLOWED_TEXT })
      const row = await ownEntry(tx, session.id, context.playerId)
      if (!row)
        throw new ServiceError('invalid', {
          player: 'Only confirmed players in this session can do this.',
        })
      if (!row.present)
        throw new ServiceError('invalid', { player: 'Check in first to request a match.' })
      const now = new Date()
      await closeStaleMatchRequests(tx, session.id, now)
      const open = await tx.sessionMatchRequest.findFirst({
        where: { sessionId: session.id, sessionPlayerId: row.id, status: 'open' },
        select: { id: true },
      })
      if (open)
        throw new ServiceError('conflict', { request: 'Match request sent · the QM decides' })
      const spots = requestSpots(format)
      if (partnersIn.length > spots.partners || opponentsIn.length > spots.opponents)
        throw new ServiceError('invalid', { request: 'Too many players for this format.' })
      const fitTo = (ids: (string | null)[], n: number) =>
        Array.from({ length: n }, (_, i) => ids[i] ?? null)
      const partners = fitTo(partnersIn, spots.partners)
      const opponents = fitTo(opponentsIn, spots.opponents)
      const named = [...partners, ...opponents].filter((id): id is string => !!id)
      if (new Set([row.id, ...named]).size !== named.length + 1)
        throw new ServiceError('conflict', { request: 'Pick each player once.' })
      const present = await presentIds(tx, session.id)
      if (named.some((id) => !present.has(id)))
        throw new ServiceError('conflict', { request: 'Present players only. Pick again.' })
      await tx.sessionMatchRequest.create({
        data: {
          id: input.requestId,
          clubId: session.clubId,
          sessionId: session.id,
          sessionPlayerId: row.id,
          format,
          requestedAt: now,
        },
      })
      const spotRows = [
        ...partners.map((id, slotNo) => ({ side: 'partner' as const, slotNo, id })),
        ...opponents.map((id, slotNo) => ({ side: 'opponent' as const, slotNo, id })),
      ]
      if (spotRows.length)
        await tx.sessionMatchRequestSpot.createMany({
          data: spotRows.map((s) => ({
            requestId: input.requestId,
            clubId: session.clubId,
            sessionId: session.id,
            side: s.side,
            slotNo: s.slotNo,
            sessionPlayerId: s.id,
          })),
        })
      return { matchRequestId: input.requestId, message: 'Match request sent' }
    })
  } catch (error) {
    if (error instanceof ServiceError) throw error
    mapDatabaseError(error)
  }
}

/** The Player's **Cancel** on their open match request: it becomes `cancelled`. */
export async function cancelMatchRequest(context: PlayerContext, slug: string) {
  requireOwnPlayer(context, context.playerId)
  const found = await sessionBySlug(slug)
  return prisma.$transaction(async (tx) => {
    const session = await lockSession(tx, found, found.id)
    const row = await ownEntry(tx, session.id, context.playerId)
    const open = row
      ? await tx.sessionMatchRequest.findFirst({
          where: { sessionId: session.id, sessionPlayerId: row.id, status: 'open' },
          select: { id: true },
        })
      : null
    if (!open) throw new ServiceError('conflict', { request: ALREADY_CLOSED })
    await tx.sessionMatchRequest.update({
      where: { id: open.id },
      data: { status: 'cancelled', decidedAt: new Date(), revision: { increment: 1 } },
    })
    return { matchRequestId: open.id, message: 'Match request cancelled' }
  })
}

/**
 * The Player's own open request (My night's “Match request sent · the QM decides”), or null. The
 * faces follow the signed-in name rule, first name only, like the queue rows on the session page.
 */
export async function readMyMatchRequest(context: PlayerContext, slug: string) {
  requireOwnPlayer(context, context.playerId)
  const found = await sessionBySlug(slug)
  return prisma.$transaction(async (tx) => {
    const row = await ownEntry(tx, found.id, context.playerId)
    if (!row) return { matchRequest: null }
    const open = (await liveOpenRequests(tx, found.id)).find((r) => r.sessionPlayerId === row.id)
    if (!open) return { matchRequest: null }
    const roster = await liveRoster(tx, found.id)
    const people = await peopleFor(tx, roster, context.playerId)
    const byId = new Map(roster.map((r) => [r.id, r]))
    const face = (id: string | null) => {
      if (!id) return null
      const person = people.get(id)
      const entry = byId.get(id)
      return {
        name: publicFirstName(person?.name ?? ''),
        level: entry ? levelCodeFor(entry.skillLevelId) : null,
        pictureUrl: person?.pictureUrl ?? null,
        masked: person?.masked ?? true,
        isViewer: person?.isViewer ?? false,
      }
    }
    const shape = requestShape(open)
    return {
      matchRequest: {
        id: open.id,
        format: shape.format,
        at: toIso(open.requestedAt),
        partners: shape.partners.map(face),
        opponents: shape.opponents.map(face),
      },
    }
  })
}

/**
 * What Request a match needs (Q17.14): the allowed formats in pill order, the minimum, and the
 * present players other than the viewer with games, level, court and waiting time. Only a Player
 * on the session's roster may read it.
 */
export async function readMatchRequestOptions(context: PlayerContext, slug: string) {
  requireOwnPlayer(context, context.playerId)
  const found = await sessionBySlug(slug)
  return prisma.$transaction(async (tx) => {
    const session = await tx.queueSession.findUniqueOrThrow({ where: { id: found.id } })
    const own = await ownEntry(tx, session.id, context.playerId)
    if (!own)
      throw new ServiceError('forbidden', {
        player: 'Only confirmed players in this session can do this.',
      })
    const { ctx, roster } = await matchContext(tx, session)
    const people = await peopleFor(tx, roster, context.playerId)
    const courts = ctx.courts
    const players = ctx.roster
      .filter((r) => r.present && r.id !== own.id)
      .map((r) => {
        const person = people.get(r.id)
        const busy = ctx.matches.find(
          (m) => holdsCourt(m) && [...m.teamA, ...m.teamB].includes(r.id),
        )
        const name = person?.name ?? maskPublicName(r.nameSnapshot)
        return {
          id: r.id,
          name,
          shortName: person?.nickname || publicFirstName(name),
          pictureUrl: person?.pictureUrl ?? null,
          level: r.level ?? null,
          games: countedGames(r.id, ctx.matches),
          playingOn: busy ? courtNames(busy, courts) : null,
          restMinutes: waitMinutes(r, ctx.matches, session.startedAt?.getTime() ?? null),
        }
      })
    return {
      viewerRosterId: own.id,
      viewerPictureUrl: people.get(own.id)?.pictureUrl ?? null,
      minimum: session.minimumGames,
      allowedFormats: allowedRequestFormats(formatsView(session)),
      players,
    }
  })
}

// ---------- Queue Master side (Q18.12) ----------

/**
 * Q-REQUESTS › Match: the open match requests, oldest first, each named spot with its counted
 * games, level and where the player is now (`{ kind: 'court', courtLabels }` / `{ kind: 'queue',
 * position }` / null). Stale requests are closed first, like the mock's sweep. Join requests and
 * drop-out notices stay on the roster read in real mode, so `join` and `dropOuts` are empty and
 * their counts 0; `selfCheckIn` is empty (self check-in is not real yet). Finished, invalid and
 * cancelled sessions return empty lists.
 */
export async function readSessionRequests(context: ClubContext, sessionId: string) {
  const found = await prisma.queueSession.findUnique({
    where: { clubId_id: { clubId: context.clubId, id: sessionId } },
  })
  if (!found) throw new ServiceError('not_found')
  await requireSessionAccess(context, found)
  return prisma.$transaction(async (tx) => {
    const session = await lockSession(tx, context, sessionId)
    const counts = (match: number) => ({
      total: match,
      join: 0,
      joinRequests: 0,
      dropOuts: 0,
      match,
    })
    const empty = {
      sessionId,
      minimum: session.minimumGames,
      join: [],
      dropOuts: [],
      selfCheckIn: {},
    }
    if (!takesRequests(session)) return { ...empty, counts: counts(0), match: [] }
    await closeStaleMatchRequests(tx, session.id)
    const open = await liveOpenRequests(tx, session.id)
    const { ctx } = await matchContext(tx, session)
    const byId = new Map(ctx.roster.map((r) => [r.id, r]))
    const waiting = ctx.matches
      .filter((m) => m.state === 'waiting')
      .sort((a, b) => a.queuePosition - b.queuePosition)
    const spot = (rosterId: string) => {
      const r = byId.get(rosterId)
      const busy = ctx.matches.find(
        (m) => holdsCourt(m) && [...m.teamA, ...m.teamB].includes(rosterId),
      )
      const queued = waiting.findIndex((m) => [...m.teamA, ...m.teamB].includes(rosterId))
      return {
        rosterId,
        name: r?.nameSnapshot ?? 'Player',
        nickname: r?.nicknameSnapshot ?? null,
        level: r?.level ?? null,
        games: countedGames(rosterId, ctx.matches),
        where: busy
          ? { kind: 'court' as const, courtLabels: courtNames(busy, ctx.courts) }
          : queued >= 0
            ? { kind: 'queue' as const, position: queued + 1 }
            : null,
      }
    }
    const match = open.map((row) => {
      const shape = requestShape(row)
      return {
        id: row.id,
        format: shape.format,
        at: toIso(row.requestedAt),
        requester: spot(shape.pid),
        partners: shape.partners.map((id) => (id ? spot(id) : null)),
        opponents: shape.opponents.map((id) => (id ? spot(id) : null)),
      }
    })
    return { ...empty, counts: counts(match.length), match }
  })
}

async function openRequestIn(tx: Tx, session: QueueSession, requestId: string) {
  if (!UUID.test(requestId)) throw new ServiceError('not_found')
  // Anyone named who stopped being present closes the request first (it never reopens).
  await closeStaleMatchRequests(tx, session.id)
  const row = await tx.sessionMatchRequest.findFirst({
    where: { id: requestId, sessionId: session.id },
    include: MATCH_REQUEST_INCLUDE,
  })
  if (!row) throw new ServiceError('not_found')
  return row
}

const requireOpen = (row: MatchRequestRow) => {
  if (row.status !== 'open') throw new ServiceError('conflict', { request: ALREADY_CLOSED })
}

/**
 * **Add to queue**: a protected `manual` waiting match at the end of the Main Queue (the next
 * match number and queue position, like Add match), its lineup from `requestLineup`; the request
 * becomes `added` with the match. Then Auto Queue, as after any add. Live sessions only; bumps the
 * queue revision. Repeat-safe: the match is keyed on an operation derived from the request, so a
 * retry returns the same match. 409 “Not enough present players to fill this FORMAT match” when the
 * Anyone spots can't be filled; 409 “This match request is already closed.” when it is not open.
 */
export async function addMatchRequestToQueue(
  context: ClubContext,
  sessionId: string,
  input: { requestId: string },
  options: AutoFillOptions = {},
) {
  let autoPlaced: AutoPlaced = []
  const done = await matchCommand(context, sessionId, {}, async (tx, session) => {
    const row = await openRequestIn(tx, session, input.requestId)
    if (row.status === 'added' && row.matchId)
      return matchDto((await loadMatch(tx, session.id, row.matchId)) as MatchRow)
    requireOpen(row)
    const { ctx, roster } = await matchContext(tx, session)
    const adjusted = new Map(roster.map((r) => [r.id, r.gamesAdjustment]))
    const lineup = requestLineup(requestShape(row), {
      roster: ctx.roster.map((r) => ({ ...r, gamesAdjustment: adjusted.get(r.id) ?? 0 })),
      matches: ctx.matches,
    })
    if (!lineup)
      throw new ServiceError('conflict', {
        request: notEnoughToFillText(FORMAT_LABELS[row.format as MatchFormat]),
      })
    const operationId = await derivedId(row.id, 'match-request:add')
    const match = await appendMatch(tx, session, new Set(roster.map((r) => r.id)), lineup, {
      operationId,
      origin: 'manual',
      manualProtected: true,
    })
    await tx.sessionMatchRequest.update({
      where: { id: row.id },
      data: {
        status: 'added',
        matchId: match.id,
        decidedAt: new Date(),
        revision: { increment: 1 },
      },
    })
    const result = matchDto(match)
    autoPlaced = await autoFillCourts(tx, session, { ...options, operationId })
    return result
  })
  return withAutoPlaced(done, autoPlaced)
}

/**
 * **Decline**: the request closes as declined; nothing is queued and the queue revision stays.
 * Replies with the requester's name and nickname for “NAME's match request declined”.
 */
export async function declineMatchRequest(
  context: ClubContext,
  sessionId: string,
  input: { requestId: string },
) {
  return prisma.$transaction(async (tx) => {
    const session = await lockSession(tx, context, sessionId)
    await requireSessionAccess(context, session, tx)
    const row = await openRequestIn(tx, session, input.requestId)
    requireOpen(row)
    await tx.sessionMatchRequest.update({
      where: { id: row.id },
      data: { status: 'declined', decidedAt: new Date(), revision: { increment: 1 } },
    })
    const requester = await tx.sessionPlayer.findUnique({
      where: { id: row.sessionPlayerId },
      select: { nameSnapshot: true, clubPlayer: { select: { nickname: true } } },
    })
    return {
      requestId: row.id,
      status: 'declined' as const,
      requester: {
        nameSnapshot: requester?.nameSnapshot ?? 'Player',
        nicknameSnapshot: requester?.clubPlayer.nickname ?? null,
      },
    }
  })
}
