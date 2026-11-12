import 'server-only'
import type { ClubContext } from '../auth/account-context'
import { prisma } from '../client/prisma'
import type { ClubPlayer, QueueSession, SessionWaitlistEntry } from '../generated/prisma/client'
import { ServiceError } from '../service/errors'
import { joinRequestDto, rosterEntryDto, waitlistDto } from './dto'
import { countedGamesByEntry } from './finalization'
import { closeStaleMatchRequests } from './match-request-store'
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
      // A match request naming anyone who stopped being present, or left the roster, closes.
      await closeStaleMatchRequests(tx, session.id)
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
 * Add anyway / Add to waitlist on a full roster (#735, D-OVERFILL). `allowOverfill` is the Queue
 * Master's explicit choice to go past the slot budget (marked `over_budget_at`); `toWaitlist`
 * always waits. Neither keeps the budget rule.
 */
export type AddPlacement = { allowOverfill?: boolean; toWaitlist?: boolean }

/**
 * Places a club player: a slot while one is open, otherwise the waitlist. `toWaitlist` (a Be
 * waitlisted request, D-2026-11-11-02, or Add to waitlist) always gives the waitlist place, even
 * during play; `allowOverfill` (Add anyway, #735) gives the slot beyond the budget. Refuses a
 * player already live on the roster or waiting. Concurrent admissions are serialized by the session
 * lock, so they cannot exceed capacity without `allowOverfill`. Repeat-safe on `operationId`.
 */
async function place(
  tx: Tx,
  context: ClubContext,
  session: QueueSession,
  clubPlayer: ClubPlayer,
  skillLevelId: number,
  operationId: string,
  addedAt: Date,
  toWaitlist = false,
  allowOverfill = false,
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
  const atBudget = (await liveRoster(tx, session.id)).length >= (await capacityOf(tx, session))
  if (toWaitlist || (atBudget && !allowOverfill))
    return {
      rosterEntry: null,
      waitlist: waitlistDto(waiter, await waitlistPosition(tx, session.id, waiter.id)),
    }
  const entry = await promoteWaiter(tx, context, session, waiter, operationId, new Date(), atBudget)
  return { rosterEntry: rosterEntryDto(entry, clubPlayer.nickname), waitlist: null }
}

/**
 * A club member's direct join from the session page (D-2026-11-12-02, #764): the same placement a
 * confirmed join request gets (`place`: a slot while one is open and `toWaitlist` is false, else the
 * waitlist), with the member's saved level as the admission's assessment, so Queue's sync, revisions
 * and roster counts see it exactly like a confirmed request. The caller holds the session lock and
 * bumps the revision. No join request row is written.
 */
export function placeClubMember(
  tx: Tx,
  context: ClubContext,
  session: QueueSession,
  clubPlayer: ClubPlayer,
  skillLevelId: number,
  operationId: string,
  now: Date,
  toWaitlist: boolean,
) {
  return place(tx, context, session, clubPlayer, skillLevelId, operationId, now, toWaitlist)
}

/**
 * Adds a saved club player to the session (Q-ROSTER · Saved players). An unclaimed profile is the
 * club's own record, so no identity check applies (D-2026-11-11-03).
 */
export async function addSavedPlayerToSession(
  context: ClubContext,
  sessionId: string,
  input: AddPlacement & {
    operationId: string
    clubPlayerId: string
    level: string
  },
) {
  return rosterCommand(context, sessionId, (tx, session) =>
    addSavedPlayerIn(tx, context, session, input),
  )
}
async function addSavedPlayerIn(
  tx: Tx,
  context: ClubContext,
  session: QueueSession,
  input: AddPlacement & {
    operationId: string
    clubPlayerId: string
    level: string
  },
) {
  const skillLevelId = levelIdFor(input.level)
  const clubPlayer = await tx.clubPlayer.findUnique({
    where: { clubId_id: { clubId: context.clubId, id: input.clubPlayerId } },
  })
  if (!clubPlayer || clubPlayer.removedAt) throw new ServiceError('not_found')
  return place(
    tx,
    context,
    session,
    clubPlayer,
    skillLevelId,
    input.operationId,
    new Date(),
    input.toWaitlist,
    input.allowOverfill,
  )
}

/**
 * New guest or phone-entered player (Q-ROSTER · New player). A phone is kept only as private intake
 * awaiting identity resolution after sync (F07.22); it never reaches roster payloads.
 */
export async function createClubPlayer(
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

/**
 * The club's saved player for a Player Information profile, created when the club has not saved
 * them yet (`club_players` is unique per club and player). Archived or unknown profiles are refused.
 */
export async function clubPlayerForProfile(
  tx: Tx,
  context: ClubContext,
  operationId: string,
  playerId: string,
  now: Date,
) {
  const saved = await tx.clubPlayer.findFirst({ where: { clubId: context.clubId, playerId } })
  // A deleted saved player is restored rather than duplicated (one saved row per profile per club).
  if (saved?.removedAt)
    return {
      clubPlayer: await tx.clubPlayer.update({
        where: { clubId_id: { clubId: context.clubId, id: saved.id } },
        data: { removedAt: null, revision: { increment: 1 } },
      }),
      created: true,
    }
  if (saved) return { clubPlayer: saved, created: false }
  const player = await tx.player.findUnique({
    where: { id: playerId },
    select: { fullName: true, nickname: true, idAllocation: { select: { rtrId: true } } },
  })
  if (!player?.idAllocation)
    throw new ServiceError('not_found', { player: 'Player not available.' })
  const clubPlayer = await tx.clubPlayer.create({
    data: {
      id: await derivedId(operationId, 'club-player'),
      clubId: context.clubId,
      playerId,
      displayName: player.fullName,
      nickname: player.nickname,
      addedAt: now,
    },
  })
  return { clubPlayer, created: true }
}

/** Adds a Player Information profile to the session, saving them to the club on the way (Q-ROSTER). */
export async function addDirectoryPlayerToSession(
  context: ClubContext,
  sessionId: string,
  input: AddPlacement & {
    operationId: string
    playerId: string
    level: string
  },
) {
  return rosterCommand(context, sessionId, (tx, session) =>
    addDirectoryPlayerIn(tx, context, session, input),
  )
}
async function addDirectoryPlayerIn(
  tx: Tx,
  context: ClubContext,
  session: QueueSession,
  input: AddPlacement & {
    operationId: string
    playerId: string
    level: string
  },
) {
  const skillLevelId = levelIdFor(input.level)
  const now = new Date()
  const { clubPlayer } = await clubPlayerForProfile(
    tx,
    context,
    input.operationId,
    input.playerId,
    now,
  )
  return place(
    tx,
    context,
    session,
    clubPlayer,
    skillLevelId,
    input.operationId,
    now,
    input.toWaitlist,
    input.allowOverfill,
  )
}

/** `phone` is already normalized to E.164 by `@rotra/schema/phone` at the Route Handler. */
export async function addNewPlayerToSession(
  context: ClubContext,
  sessionId: string,
  input: AddPlacement & {
    operationId: string
    name: string
    nickname?: string
    phone?: string
    level: string
  },
) {
  return rosterCommand(context, sessionId, (tx, session) =>
    addNewPlayerIn(tx, context, session, input),
  )
}
async function addNewPlayerIn(
  tx: Tx,
  context: ClubContext,
  session: QueueSession,
  input: AddPlacement & {
    operationId: string
    name: string
    nickname?: string
    phone?: string
    level: string
  },
) {
  const skillLevelId = levelIdFor(input.level)
  const now = new Date()
  const clubPlayer = await createClubPlayer(tx, context, input.operationId, input, now)
  return place(
    tx,
    context,
    session,
    clubPlayer,
    skillLevelId,
    input.operationId,
    now,
    input.toWaitlist,
    input.allowOverfill,
  )
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
  return rosterCommand(context, sessionId, (tx, session) =>
    removeRosterPlayerIn(tx, session, rosterId),
  )
}
async function removeRosterPlayerIn(tx: Tx, session: QueueSession, rosterId: string) {
  requireState(session, ['prepared'], 'Only a prepared roster can remove players.')
  const entry = await tx.sessionPlayer.findUnique({ where: { id: rosterId } })
  if (!entry || entry.sessionId !== session.id) throw new ServiceError('not_found')
  if (entry.releasedAt) return null
  await tx.sessionPlayer.update({
    where: { id: entry.id },
    data: { releasedAt: new Date(), releaseReason: 'removed', revision: { increment: 1 } },
  })
  return null
}

/**
 * Move to waitlist (#735): the admitted player steps down to the **front** of the waitlist, before
 * and after Start. Like a budget demotion, the roster entry is released (reason `demoted`), so its
 * assessments, paid mark and finished matches stay on the record and regaining a slot reactivates
 * the same entry; the waitlist row carries the level and `demoted_at` puts it first. Refused while
 * the player is in any waiting, On court or Playing match. Repeat-safe on `operationId`.
 */
export async function stepDownToWaitlist(
  context: ClubContext,
  sessionId: string,
  input: { operationId: string; rosterId: string },
) {
  if (!input.operationId)
    throw new ServiceError('invalid', { operationId: 'Missing operation id.' })
  return rosterCommand(context, sessionId, (tx, session) =>
    stepDownIn(tx, session, input, (name) => `Finish or remove ${name}'s match first.`),
  )
}

/**
 * The step-down itself, on a locked prepared or active session (shared by the Queue Master's Move
 * to waitlist and the signed-in Player's Move me to the waitlist). `blocked` words the 409.
 */
export async function stepDownIn(
  tx: Tx,
  session: QueueSession,
  input: { operationId: string; rosterId: string },
  blocked: (shortName: string) => string,
) {
  const sessionId = session.id
  const waitlistId = await derivedId(input.operationId, 'step-down')
  const entry = await tx.sessionPlayer.findUnique({ where: { id: input.rosterId } })
  if (!entry || entry.sessionId !== sessionId) throw new ServiceError('not_found')
  // A retry of the same operation returns what it already did.
  if (await tx.sessionWaitlistEntry.findUnique({ where: { id: waitlistId } }))
    return { name: entry.nameSnapshot, clubPlayerId: entry.clubPlayerId }
  if (entry.releasedAt) throw new ServiceError('not_found')
  const busy = await tx.matchParticipation.findFirst({
    where: {
      sessionId,
      sessionPlayerId: entry.id,
      leftAt: null,
      match: { state: { in: ['waiting', 'on_court', 'active'] }, removedAt: null },
    },
    select: { id: true },
  })
  if (busy) {
    const clubPlayer = await tx.clubPlayer.findUniqueOrThrow({
      where: { id: entry.clubPlayerId },
      select: { nickname: true },
    })
    const name = clubPlayer.nickname || entry.nameSnapshot.split(' ')[0] || entry.nameSnapshot
    throw new ServiceError('conflict', { player: blocked(name) })
  }
  const now = new Date()
  await tx.sessionPlayer.update({
    where: { id: entry.id },
    data: { releasedAt: now, releaseReason: 'demoted', revision: { increment: 1 } },
  })
  await tx.sessionWaitlistEntry.create({
    data: {
      id: waitlistId,
      clubId: session.clubId,
      sessionId,
      clubPlayerId: entry.clubPlayerId,
      skillLevelId: entry.skillLevelId,
      addedAt: entry.joinedAt,
      demotedAt: now,
      demotedConfirmedAt: entry.confirmedAt,
    },
  })
  return { name: entry.nameSnapshot, clubPlayerId: entry.clubPlayerId }
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

export const GAMES_PLAYED_MAX = 99

/**
 * Set games played (#717, D-SET-GAMES): one live entry, or every live entry (`all`), shows `games`
 * from now on. Stored as `games_adjustment = games − counted games` so later matches keep counting
 * up; the shown count is `max(0, counted + adjustment)`. Active sessions only. Repeat-safe in effect:
 * a retry with the same target and count rewrites the same adjustment as long as no match completed
 * in between (no operation row exists for this command yet; `operationId` is accepted for the sync
 * log and future idempotency).
 */
export async function setGamesPlayed(
  context: ClubContext,
  sessionId: string,
  input: { operationId: string; games: number; rosterId?: string; all?: boolean },
) {
  return rosterCommand(context, sessionId, async (tx, session) => {
    requireState(session, ['active'], 'Start the session first.')
    if (!Number.isSafeInteger(input.games) || input.games < 0 || input.games > GAMES_PLAYED_MAX)
      throw new ServiceError('invalid', {
        games: `Enter a whole number of games, 0 to ${GAMES_PLAYED_MAX}.`,
      })
    const entries = input.all
      ? await liveRoster(tx, sessionId)
      : [await liveEntry(tx, sessionId, input.rosterId ?? '')]
    if (!entries.length)
      throw new ServiceError('invalid', { roster: 'No players on the roster yet.' })
    const counted = await countedGamesByEntry(tx, sessionId)
    const changed: { rosterId: string; name: string; games: number }[] = []
    for (const entry of entries) {
      const played = counted.get(entry.id) ?? 0
      const adjustment = input.games - played
      if (entry.gamesAdjustment !== adjustment)
        await tx.sessionPlayer.update({
          where: { id: entry.id },
          data: { gamesAdjustment: adjustment, revision: { increment: 1 } },
        })
      changed.push({
        rosterId: entry.id,
        name: entry.nameSnapshot,
        games: Math.max(0, played + adjustment),
      })
    }
    return { changed }
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

/** The requesting Player's picture (and its name seed) for `joinRequestDto`; a guest's request has no Player. */
const withPlayerPicture = { player: { select: { avatarRef: true, fullName: true } } } as const

async function pendingRequest(tx: Tx, context: ClubContext, requestId: string) {
  const request = await tx.sessionJoinRequest.findUnique({
    where: { id: requestId },
    include: withPlayerPicture,
  })
  if (!request || request.clubId !== context.clubId) throw new ServiceError('not_found')
  return request
}

/**
 * Confirms a join request: a guest's creates the club player (phone kept as private intake); a
 * signed-in Player's (`player_id`, D-2026-11-09-02) uses their saved player in this club, created
 * or restored from the profile when needed, never a new guest. Then a slot or a waitlist entry that
 * arrives at the request's time, in one transaction. Repeat-safe.
 */
export async function confirmJoinRequest(
  context: ClubContext,
  input: { operationId: string; requestId: string; level: string; deviceId?: string | null },
) {
  levelIdFor(input.level)
  const request = await prisma.sessionJoinRequest.findUnique({
    where: { id: input.requestId },
    select: { sessionId: true, clubId: true },
  })
  if (!request || request.clubId !== context.clubId) throw new ServiceError('not_found')
  return rosterCommand(context, request.sessionId, (tx, session) =>
    confirmJoinRequestIn(tx, context, session, input),
  )
}
/** The confirm inside a locked session; a request of another session is not found here. */
async function confirmJoinRequestIn(
  tx: Tx,
  context: ClubContext,
  session: QueueSession,
  input: { operationId: string; requestId: string; level: string; deviceId?: string | null },
) {
  const skillLevelId = levelIdFor(input.level)
  const current = await pendingRequest(tx, context, input.requestId)
  if (current.sessionId !== session.id) throw new ServiceError('not_found')
  if (current.status !== 'pending') {
    // A Player's request keeps their own saved player, so the derived ID can't identify a replay;
    // confirming it again has the same outcome.
    if (
      current.status === 'confirmed' &&
      (current.playerId != null ||
        current.clubPlayerId === (await derivedId(input.operationId, 'club-player')))
    )
      return { request: joinRequestDto(current), rosterEntry: null, waitlist: null }
    throw new ServiceError('conflict', { request: 'This join request has already been decided.' })
  }
  const now = new Date()
  // D-2026-11-11-02: Join from waitlist. Give slot (prepared, never over the budget) / Admit
  // player (live, over the budget allowed) on the Player's own waitlist entry.
  if (current.placement === 'from_waitlist') {
    const entry = current.clubPlayerId
      ? await tx.sessionWaitlistEntry.findUnique({
          where: {
            sessionId_clubPlayerId: { sessionId: session.id, clubPlayerId: current.clubPlayerId },
          },
        })
      : null
    // Removed from the waitlist meanwhile: refused, the QM declines the request.
    if (!entry)
      throw new ServiceError('conflict', {
        request: `${current.name} is no longer on the waitlist.`,
      })
    const over = (await liveRoster(tx, session.id)).length >= (await capacityOf(tx, session))
    if (over && session.state !== 'active')
      throw new ServiceError('conflict', {
        request: `Slots are full again. ${current.name} stays on the waitlist.`,
      })
    const levelled = await tx.sessionWaitlistEntry.update({
      where: { id: entry.id },
      data: { skillLevelId },
    })
    const promoted = await promoteWaiter(
      tx,
      context,
      session,
      levelled,
      input.operationId,
      now,
      over,
    )
    const clubPlayer = await tx.clubPlayer.findUniqueOrThrow({
      where: { id: promoted.clubPlayerId },
    })
    const decided = await tx.sessionJoinRequest.update({
      where: { id: current.id },
      data: {
        status: 'confirmed',
        decidedAt: now,
        decidedByDeviceId: input.deviceId ?? null,
        revision: { increment: 1 },
      },
      include: withPlayerPicture,
    })
    return {
      request: joinRequestDto(decided),
      rosterEntry: rosterEntryDto(promoted, clubPlayer.nickname),
      waitlist: null,
    }
  }
  const clubPlayer = current.playerId
    ? (await clubPlayerForProfile(tx, context, input.operationId, current.playerId, now)).clubPlayer
    : await createClubPlayer(
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
    current.placement === 'waitlist',
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
    include: withPlayerPicture,
  })
  return { request: joinRequestDto(decided), ...placed }
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
  return rosterCommand(context, request.sessionId, (tx, session) =>
    declineJoinRequestIn(tx, context, session, input),
  )
}
async function declineJoinRequestIn(
  tx: Tx,
  context: ClubContext,
  session: QueueSession,
  input: { requestId: string; deviceId?: string | null },
) {
  const current = await pendingRequest(tx, context, input.requestId)
  if (current.sessionId !== session.id) throw new ServiceError('not_found')
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
    include: withPlayerPicture,
  })
  return joinRequestDto(decided)
}

/** Q-ROSTER read: live roster in slot order, waitlist in its order with positions, pending requests. */
export async function readSessionRoster(context: ClubContext, sessionId: string) {
  const session = await prisma.queueSession.findUnique({
    where: { clubId_id: { clubId: context.clubId, id: sessionId } },
  })
  if (!session) throw new ServiceError('not_found')
  await requireSessionAccess(context, session)
  return prisma.$transaction((tx) => readSessionRosterIn(tx, context, session))
}
async function readSessionRosterIn(tx: Tx, context: ClubContext, session: QueueSession) {
  const sessionId = session.id
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
  const clubPlayerIds = [...new Set(roster.map((entry) => entry.clubPlayerId))]
  const prior = clubPlayerIds.length
    ? await tx.clubSessionPlayerSummary.findMany({
        where: {
          clubId: context.clubId,
          clubPlayerId: { in: clubPlayerIds },
          sessionId: { not: sessionId },
          finalization: { committedAt: { lt: session.finalizedAt ?? new Date() } },
        },
        select: { clubPlayerId: true },
        distinct: ['clubPlayerId'],
      })
    : []
  const returning = new Set(prior.map((row) => row.clubPlayerId))
  const requests = await tx.sessionJoinRequest.findMany({
    where: { sessionId, status: 'pending' },
    orderBy: [{ requestedAt: 'asc' }, { id: 'asc' }],
    include: withPlayerPicture,
  })
  return {
    capacity: await capacityOf(tx, session),
    roster: roster.map((entry) => ({
      ...rosterEntryDto(entry, nicknames.get(entry.clubPlayerId) ?? null),
      hasPlayedAtClubBefore: returning.has(entry.clubPlayerId),
    })),
    waitlist: waitlist.map((entry, index) => waitlistDto(entry, index + 1)),
    joinRequests: requests.map(joinRequestDto),
  }
}

// ---------- Roster burst batch (#718) ----------

/** One operation of the roster burst batch, as the Route Handler validated it. */
export type RosterBatchOperation =
  | (AddPlacement & {
      op: 'add'
      operationId: string
      source: 'saved'
      clubPlayerId: string
      level: string
    })
  | (AddPlacement & {
      op: 'add'
      operationId: string
      source: 'directory'
      playerId: string
      level: string
    })
  | (AddPlacement & {
      op: 'add'
      operationId: string
      source: 'new'
      name: string
      nickname?: string
      phone?: string
      level: string
    })
  | { op: 'remove'; operationId: string; rosterId: string }
  | { op: 'acceptRequest'; operationId: string; requestId: string; level: string }
  | { op: 'declineRequest'; operationId: string; requestId: string }

export const MAX_ROSTER_BATCH_OPERATIONS = 100

/**
 * The Queue Master's burst of adds, removes and join-request decisions (#718), applied in the
 * order given inside one locked-session transaction: all of it lands or none of it does, with one
 * revision bump and one minimum recomputation. Each operation runs the same rules as its single-op
 * service and is repeat-safe on its `operationId`, so a retried batch repeats nothing. The reply
 * carries every operation's outcome and the roster as saved now.
 */
export async function applyRosterBatch(
  context: ClubContext,
  sessionId: string,
  operations: RosterBatchOperation[],
  deviceId: string | null = null,
) {
  if (!operations.length || operations.length > MAX_ROSTER_BATCH_OPERATIONS)
    throw new ServiceError('invalid', { operations: 'Send between 1 and 100 roster changes.' })
  const ids = new Set(operations.map((operation) => operation.operationId))
  if (ids.size !== operations.length || [...ids].some((id) => !id))
    throw new ServiceError('invalid', { operations: 'Every change needs its own operation id.' })
  return rosterCommand(context, sessionId, async (tx, session) => {
    const results: {
      operationId: string
      op: RosterBatchOperation['op']
      rosterEntry: ReturnType<typeof rosterEntryDto> | null
      waitlist: ReturnType<typeof waitlistDto> | null
      request: ReturnType<typeof joinRequestDto> | null
    }[] = []
    for (const operation of operations) {
      const base = { operationId: operation.operationId, op: operation.op }
      switch (operation.op) {
        case 'add': {
          const placed =
            operation.source === 'saved'
              ? await addSavedPlayerIn(tx, context, session, operation)
              : operation.source === 'directory'
                ? await addDirectoryPlayerIn(tx, context, session, operation)
                : await addNewPlayerIn(tx, context, session, operation)
          results.push({ ...base, ...placed, request: null })
          break
        }
        case 'remove':
          await removeRosterPlayerIn(tx, session, operation.rosterId)
          results.push({ ...base, rosterEntry: null, waitlist: null, request: null })
          break
        case 'acceptRequest': {
          const confirmed = await confirmJoinRequestIn(tx, context, session, {
            ...operation,
            deviceId,
          })
          results.push({ ...base, ...confirmed })
          break
        }
        case 'declineRequest':
          results.push({
            ...base,
            rosterEntry: null,
            waitlist: null,
            request: await declineJoinRequestIn(tx, context, session, { ...operation, deviceId }),
          })
          break
      }
    }
    return { results, roster: await readSessionRosterIn(tx, context, session) }
  })
}
