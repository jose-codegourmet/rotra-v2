import 'server-only'
import type { ClubContext } from '../auth/account-context'
import { prisma } from '../client/prisma'
import type { ClubPlayer, QueueSession, SessionWaitlistEntry } from '../generated/prisma/client'
import { ServiceError } from '../service/errors'
import { joinRequestDto, rosterEntryDto, waitlistDto } from './dto'
import {
  assessEntry,
  capacityOf,
  derivedId,
  levelIdFor,
  liveRoster,
  lockSession,
  mapDatabaseError,
  orderedWaitlist,
  promoteWaiter,
  recomputeMinimum,
  requireSessionAccess,
  requireState,
  type Tx,
  touchSession,
} from './session-store'

/** How the operator confirmed an unclaimed profile's identity (Q-ROSTER). */
export type IdentityCheck = 'rtr-id' | 'qr' | 'phone'

const E164 = /^\+[1-9][0-9]{7,14}$/

/**
 * Runs a roster command on a locked session. Every roster change bumps the session revision and
 * recomputes a calculated minimum while prepared.
 */
async function rosterCommand<T>(
  context: ClubContext,
  sessionId: string,
  change: (tx: Tx, session: QueueSession) => Promise<T>,
) {
  try {
    return await prisma.$transaction(async (tx) => {
      const session = await lockSession(tx, context, sessionId)
      await requireSessionAccess(context, session)
      requireState(session, ['prepared', 'active'], 'This session is closed.')
      const result = await change(tx, session)
      await recomputeMinimum(tx, await touchSession(tx, session))
      return result
    })
  } catch (error) {
    mapDatabaseError(error)
  }
}

async function waitlistPosition(tx: Tx, sessionId: string, entryId: string) {
  return (await orderedWaitlist(tx, sessionId)).findIndex((w) => w.id === entryId) + 1
}

/**
 * Places a club player: a slot while one is open, otherwise the waitlist. Refuses a player already
 * live on the roster or waiting. Concurrent admissions are serialized by the session lock, so they
 * cannot exceed capacity. Repeat-safe on `operationId`.
 */
async function place(
  tx: Tx,
  context: ClubContext,
  session: QueueSession,
  clubPlayer: ClubPlayer,
  skillLevelId: number,
  operationId: string,
  addedAt: Date,
) {
  const waitlistId = await derivedId(operationId, 'waitlist')
  // A retry of the same operation returns what it already did.
  const admitted = await tx.clubAssessment.findUnique({ where: { sourceOperationId: operationId } })
  if (admitted) {
    const entry = await tx.sessionPlayer.findUniqueOrThrow({
      where: { id: admitted.sessionPlayerId },
    })
    return { rosterEntry: rosterEntryDto(entry, clubPlayer.nickname), waitlist: null }
  }
  const waiting = await tx.sessionWaitlistEntry.findUnique({
    where: { sessionId_clubPlayerId: { sessionId: session.id, clubPlayerId: clubPlayer.id } },
  })
  if (waiting?.id === waitlistId)
    return {
      rosterEntry: null,
      waitlist: waitlistDto(waiting, await waitlistPosition(tx, session.id, waiting.id)),
    }
  const live = await tx.sessionPlayer.findUnique({
    where: { sessionId_clubPlayerId: { sessionId: session.id, clubPlayerId: clubPlayer.id } },
  })
  if (waiting || (live && !live.releasedAt))
    throw new ServiceError('conflict', {
      player: 'This player is already on the roster or waitlist.',
    })

  const waiter = await tx.sessionWaitlistEntry.create({
    data: {
      id: waitlistId,
      clubId: context.clubId,
      sessionId: session.id,
      clubPlayerId: clubPlayer.id,
      skillLevelId,
      addedAt,
    },
  })
  const full = (await liveRoster(tx, session.id)).length >= (await capacityOf(tx, session))
  if (full)
    return {
      rosterEntry: null,
      waitlist: waitlistDto(waiter, await waitlistPosition(tx, session.id, waiter.id)),
    }
  const entry = await promoteWaiter(tx, context, session, waiter, operationId, new Date())
  return { rosterEntry: rosterEntryDto(entry, clubPlayer.nickname), waitlist: null }
}

/** Unclaimed profiles need an identity check; a phone check is not allowed when the phone is hidden. */
async function requireIdentity(tx: Tx, clubPlayer: ClubPlayer, check?: IdentityCheck) {
  if (!clubPlayer.playerId) return
  const player = await tx.player.findUniqueOrThrow({
    where: { id: clubPlayer.playerId },
    select: { profileState: true, hidePhoneFromClubs: true },
  })
  if (player.profileState !== 'unclaimed') return
  if (
    !check ||
    !['rtr-id', 'qr', 'phone'].includes(check) ||
    (check === 'phone' && player.hidePhoneFromClubs)
  )
    throw new ServiceError('invalid', {
      identity: 'Confirm this player’s identity before adding them.',
    })
}

/** Adds a saved club player to the session (Q-ROSTER · Saved players). */
export async function addSavedPlayerToSession(
  context: ClubContext,
  sessionId: string,
  input: {
    operationId: string
    clubPlayerId: string
    level: string
    identityCheck?: IdentityCheck
  },
) {
  const skillLevelId = levelIdFor(input.level)
  return rosterCommand(context, sessionId, async (tx, session) => {
    const clubPlayer = await tx.clubPlayer.findUnique({
      where: { clubId_id: { clubId: context.clubId, id: input.clubPlayerId } },
    })
    if (!clubPlayer) throw new ServiceError('not_found')
    await requireIdentity(tx, clubPlayer, input.identityCheck)
    return place(tx, context, session, clubPlayer, skillLevelId, input.operationId, new Date())
  })
}

/**
 * New guest or phone-entered player (Q-ROSTER · New player). A phone is kept only as private intake
 * awaiting identity resolution after sync (F07.22); it never reaches roster payloads.
 */
async function createClubPlayer(
  tx: Tx,
  context: ClubContext,
  operationId: string,
  input: { name: string; nickname?: string | null; phone?: string | null },
  now: Date,
) {
  const id = await derivedId(operationId, 'club-player')
  const existing = await tx.clubPlayer.findUnique({
    where: { clubId_id: { clubId: context.clubId, id } },
  })
  if (existing) return existing
  const name = input.name.trim()
  if (!name) throw new ServiceError('invalid', { name: 'Enter a name.' })
  const phone = input.phone?.trim() || null
  if (phone && !E164.test(phone))
    throw new ServiceError('invalid', { phone: 'Enter a full mobile number, or leave it empty.' })
  const clubPlayer = await tx.clubPlayer.create({
    data: {
      id,
      clubId: context.clubId,
      displayName: name,
      nickname: input.nickname?.trim() || null,
      addedAt: now,
    },
  })
  if (phone)
    await tx.clubPlayerPrivateInput.create({
      data: { clubPlayerId: id, clubId: context.clubId, phoneE164: phone, capturedAt: now },
    })
  return clubPlayer
}

/** `phone` is already normalized to E.164 by `@rotra/schema/phone` at the Route Handler. */
export async function addNewPlayerToSession(
  context: ClubContext,
  sessionId: string,
  input: { operationId: string; name: string; nickname?: string; phone?: string; level: string },
) {
  const skillLevelId = levelIdFor(input.level)
  return rosterCommand(context, sessionId, async (tx, session) => {
    const now = new Date()
    const clubPlayer = await createClubPlayer(tx, context, input.operationId, input, now)
    return place(tx, context, session, clubPlayer, skillLevelId, input.operationId, now)
  })
}

async function liveEntry(tx: Tx, sessionId: string, rosterId: string) {
  const entry = await tx.sessionPlayer.findUnique({ where: { id: rosterId } })
  if (!entry || entry.sessionId !== sessionId || entry.releasedAt)
    throw new ServiceError('not_found')
  return entry
}

async function waiter(
  tx: Tx,
  sessionId: string,
  waitlistId: string,
): Promise<SessionWaitlistEntry> {
  const entry = await tx.sessionWaitlistEntry.findUnique({ where: { id: waitlistId } })
  if (!entry || entry.sessionId !== sessionId) throw new ServiceError('not_found')
  return entry
}

/** Changes a prepared entry's level by appending a new assessment (never rewriting the old one). */
export async function setRosterLevel(
  context: ClubContext,
  sessionId: string,
  input: { operationId: string; rosterId: string; level: string },
) {
  const skillLevelId = levelIdFor(input.level)
  return rosterCommand(context, sessionId, async (tx, session) => {
    requireState(session, ['prepared'], 'Levels are locked after the session starts.')
    const entry = await liveEntry(tx, sessionId, input.rosterId)
    await assessEntry(tx, context, entry, skillLevelId, input.operationId, new Date())
    const updated = await tx.sessionPlayer.findUniqueOrThrow({ where: { id: entry.id } })
    const clubPlayer = await tx.clubPlayer.findUniqueOrThrow({ where: { id: entry.clubPlayerId } })
    return rosterEntryDto(updated, clubPlayer.nickname)
  })
}

/**
 * Removes a prepared entry by releasing it (reason `removed`). The row, its assessments and any paid
 * marks are kept; whether those assessments still count is open (#245, #247). Active sessions turn
 * presence off instead.
 */
export async function removeRosterPlayer(
  context: ClubContext,
  sessionId: string,
  rosterId: string,
) {
  return rosterCommand(context, sessionId, async (tx, session) => {
    requireState(session, ['prepared'], 'Only a prepared roster can remove players.')
    const entry = await tx.sessionPlayer.findUnique({ where: { id: rosterId } })
    if (!entry || entry.sessionId !== sessionId) throw new ServiceError('not_found')
    if (entry.releasedAt) return null
    await tx.sessionPlayer.update({
      where: { id: entry.id },
      data: { releasedAt: new Date(), releaseReason: 'removed', revision: { increment: 1 } },
    })
    return null
  })
}

export async function setPresence(
  context: ClubContext,
  sessionId: string,
  input: { rosterId: string; present: boolean },
) {
  return rosterCommand(context, sessionId, async (tx) => {
    const entry = await liveEntry(tx, sessionId, input.rosterId)
    if (entry.present === input.present) return null
    await tx.sessionPlayer.update({
      where: { id: entry.id },
      data: { present: input.present, presentChangedAt: new Date(), revision: { increment: 1 } },
    })
    return null
  })
}

export async function setAllPresence(context: ClubContext, sessionId: string, present: boolean) {
  return rosterCommand(context, sessionId, async (tx, session) => {
    requireState(session, ['prepared'], 'Mark players individually after the session starts.')
    await tx.sessionPlayer.updateMany({
      where: { sessionId, releasedAt: null, present: !present },
      data: { present, presentChangedAt: new Date(), revision: { increment: 1 } },
    })
    return null
  })
}

/** Gives one waitlisted player a slot, even over budget (the operator's explicit choice). */
export async function giveSlot(
  context: ClubContext,
  sessionId: string,
  input: { operationId: string; waitlistId: string },
) {
  return rosterCommand(context, sessionId, async (tx, session) => {
    const done = await tx.clubAssessment.findUnique({
      where: { sourceOperationId: input.operationId },
    })
    if (done) {
      const entry = await tx.sessionPlayer.findUniqueOrThrow({
        where: { id: done.sessionPlayerId },
      })
      return rosterEntryDto(entry, null)
    }
    const entry = await waiter(tx, sessionId, input.waitlistId)
    const over = (await liveRoster(tx, sessionId)).length >= (await capacityOf(tx, session))
    const promoted = await promoteWaiter(
      tx,
      context,
      session,
      entry,
      input.operationId,
      new Date(),
      over,
    )
    const clubPlayer = await tx.clubPlayer.findUniqueOrThrow({
      where: { id: promoted.clubPlayerId },
    })
    return rosterEntryDto(promoted, clubPlayer.nickname)
  })
}

/** Fills open slots from the front of the waitlist; entries without a level are skipped. */
export async function fillOpenSlots(context: ClubContext, sessionId: string, operationId: string) {
  return rosterCommand(context, sessionId, async (tx, session) => {
    let open = (await capacityOf(tx, session)) - (await liveRoster(tx, sessionId)).length
    let moved = 0
    const now = new Date()
    for (const entry of await orderedWaitlist(tx, sessionId)) {
      if (open <= 0) break
      if (entry.skillLevelId == null) continue
      await promoteWaiter(tx, context, session, entry, await derivedId(operationId, entry.id), now)
      open--
      moved++
    }
    return { moved }
  })
}

export async function removeFromWaitlist(
  context: ClubContext,
  sessionId: string,
  waitlistId: string,
) {
  return rosterCommand(context, sessionId, async (tx) => {
    const entry = await tx.sessionWaitlistEntry.findUnique({ where: { id: waitlistId } })
    if (!entry) return null
    if (entry.sessionId !== sessionId) throw new ServiceError('not_found')
    await tx.sessionWaitlistEntry.delete({ where: { id: entry.id } })
    return null
  })
}

async function pendingRequest(tx: Tx, context: ClubContext, requestId: string) {
  const request = await tx.sessionJoinRequest.findUnique({ where: { id: requestId } })
  if (!request || request.clubId !== context.clubId) throw new ServiceError('not_found')
  return request
}

/**
 * Confirms a guest join request: creates the club player (phone kept as private intake), then a slot
 * or a waitlist entry that arrives at the request's time, in one transaction. Repeat-safe.
 */
export async function confirmJoinRequest(
  context: ClubContext,
  input: { operationId: string; requestId: string; level: string; deviceId?: string | null },
) {
  const skillLevelId = levelIdFor(input.level)
  const request = await prisma.sessionJoinRequest.findUnique({
    where: { id: input.requestId },
    select: { sessionId: true, clubId: true },
  })
  if (!request || request.clubId !== context.clubId) throw new ServiceError('not_found')
  return rosterCommand(context, request.sessionId, async (tx, session) => {
    const current = await pendingRequest(tx, context, input.requestId)
    if (current.status !== 'pending') {
      if (
        current.status === 'confirmed' &&
        current.clubPlayerId === (await derivedId(input.operationId, 'club-player'))
      )
        return { request: joinRequestDto(current), rosterEntry: null, waitlist: null }
      throw new ServiceError('conflict', { request: 'This join request has already been decided.' })
    }
    const now = new Date()
    const clubPlayer = await createClubPlayer(
      tx,
      context,
      input.operationId,
      { name: current.name, nickname: current.nickname, phone: current.phoneE164 },
      now,
    )
    const placed = await place(
      tx,
      context,
      session,
      clubPlayer,
      skillLevelId,
      input.operationId,
      current.requestedAt,
    )
    const decided = await tx.sessionJoinRequest.update({
      where: { id: current.id },
      data: {
        status: 'confirmed',
        decidedAt: now,
        decidedByDeviceId: input.deviceId ?? null,
        clubPlayerId: clubPlayer.id,
        revision: { increment: 1 },
      },
    })
    return { request: joinRequestDto(decided), ...placed }
  })
}

export async function declineJoinRequest(
  context: ClubContext,
  input: { requestId: string; deviceId?: string | null },
) {
  const request = await prisma.sessionJoinRequest.findUnique({
    where: { id: input.requestId },
    select: { sessionId: true, clubId: true },
  })
  if (!request || request.clubId !== context.clubId) throw new ServiceError('not_found')
  return rosterCommand(context, request.sessionId, async (tx) => {
    const current = await pendingRequest(tx, context, input.requestId)
    if (current.status === 'declined') return joinRequestDto(current)
    if (current.status !== 'pending')
      throw new ServiceError('conflict', { request: 'This join request has already been decided.' })
    const decided = await tx.sessionJoinRequest.update({
      where: { id: current.id },
      data: {
        status: 'declined',
        decidedAt: new Date(),
        decidedByDeviceId: input.deviceId ?? null,
        revision: { increment: 1 },
      },
    })
    return joinRequestDto(decided)
  })
}

/** Q-ROSTER read: live roster in slot order, waitlist in its order with positions, pending requests. */
export async function readSessionRoster(context: ClubContext, sessionId: string) {
  const session = await prisma.queueSession.findUnique({
    where: { clubId_id: { clubId: context.clubId, id: sessionId } },
  })
  if (!session) throw new ServiceError('not_found')
  await requireSessionAccess(context, session)
  return prisma.$transaction(async (tx) => {
    const roster = await liveRoster(tx, sessionId)
    const waitlist = await orderedWaitlist(tx, sessionId)
    const nicknames = new Map(
      (
        await tx.clubPlayer.findMany({
          where: { clubId: context.clubId, id: { in: roster.map((r) => r.clubPlayerId) } },
          select: { id: true, nickname: true },
        })
      ).map((p) => [p.id, p.nickname]),
    )
    const requests = await tx.sessionJoinRequest.findMany({
      where: { sessionId, status: 'pending' },
      orderBy: [{ requestedAt: 'asc' }, { id: 'asc' }],
    })
    return {
      capacity: await capacityOf(tx, session),
      roster: roster.map((entry) =>
        rosterEntryDto(entry, nicknames.get(entry.clubPlayerId) ?? null),
      ),
      waitlist: waitlist.map((entry, index) => waitlistDto(entry, index + 1)),
      joinRequests: requests.map(joinRequestDto),
    }
  })
}
