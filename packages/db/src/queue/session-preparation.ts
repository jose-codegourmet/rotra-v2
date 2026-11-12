import 'server-only'
import {
  publicSlugFor,
  sessionEndCourtConflict,
  sessionEndError,
  sessionOccurrences,
  slotCapacity,
  startNeedsNewEnd,
  startNewEndError,
} from '@rotra/data/queue-session/queueSession.rules'
import type { QueueSession as SessionView } from '@rotra/data/queue-session/types'
import type { ClubContext } from '../auth/account-context'
import { prisma } from '../client/prisma'
import type { QueueSession, SessionCourt, SessionMode } from '../generated/prisma/client'
import { requireClubEntitlement, requireRevision } from '../service/authorize'
import { ServiceError } from '../service/errors'
import { courtDto, requestFormatsInput, sessionDto } from './dto'
import { autoFillCourts } from './match-control'
import { liveOpenRequests } from './match-request-store'
import {
  derivedId,
  liveCourts,
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

/** Q-SETUP input. Instants are ISO strings. Cost estimates are written by the financials ticket. */
export type QueueSessionInput = {
  title: string
  notes: string
  venueId: string
  scheduledStartAt: string
  scheduledEndAt: string
  sessionMode: SessionMode
  allowSingles: boolean
  allowDoubles: boolean
  minimumGames: number
  minimumIsCalculated: boolean
  expectedPlayers: number | null
  playersPerCourt?: number
  /**
   * Players can request (D-2026-11-09-05): `RequestFormats` switches or a list of formats. Left out
   * on create, the prototype default (2 v 2, plus 1 v 1 when singles is on); on edit, unchanged.
   */
  requestFormats?: unknown
  /**
   * `id` keeps an existing court on edit; courts left out are removed. `startsAt` is the planned
   * start (null or the session start = follows the session start).
   */
  courts: { id?: string; label: string; startsAt?: string | null; openUntil?: string | null }[]
  repeat?: 'none' | 'weekly' | 'biweekly' | 'monthly'
  occurrences?: number
}

const ms = (iso: string) => {
  const value = Date.parse(iso)
  if (!Number.isFinite(value))
    throw new ServiceError('invalid', { schedule: 'Enter a date and time.' })
  return value
}

const COURT_LABEL_MAX = 40
const CLUB_TIME_ZONE = 'Asia/Manila'
const clubTime = (at: number) =>
  new Date(at).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: CLUB_TIME_ZONE,
  })

/**
 * The court window on full instants, mirroring `courtWindowError` in `@rotra/schema/court-window`
 * (this package does not depend on it): the planned start is not before the session start and is
 * before the session end; the end (null = session end) is after the start and not after the
 * session end. Planned endings are advisory, so a passed end is allowed.
 */
function courtWindowError(
  start: number,
  end: number | null,
  sessionStart: number,
  sessionEnd: number,
): Record<string, string> | null {
  const until = end ?? sessionEnd
  if (until > sessionEnd)
    return {
      openUntil: `That's after the session ends at ${clubTime(sessionEnd)}. Pick an earlier time, or extend the session first.`,
    }
  if (start < sessionStart || start >= sessionEnd)
    return { startsAt: 'Choose a planned start within the session.' }
  if (until <= start) return { openUntil: 'Choose an end after the planned start.' }
  return null
}

/** The session start courts count from: the actual start once live. */
const sessionBase = (session: QueueSession) =>
  (session.startedAt ?? session.scheduledStartAt).getTime()

/** A planned start equal to the session start is stored as null: it follows the session start. */
const plannedStart = (startsAt: string | null | undefined, sessionStart: number) => {
  const at = startsAt ? ms(startsAt) : sessionStart
  return at === sessionStart ? null : at
}

async function validate(tx: Tx, context: ClubContext, input: QueueSessionInput) {
  const venue = await tx.clubVenue.findUnique({
    where: { clubId_id: { clubId: context.clubId, id: input.venueId } },
  })
  const start = ms(input.scheduledStartAt)
  const end = ms(input.scheduledEndAt)
  if (
    !venue ||
    !input.title.trim() ||
    !input.courts.length ||
    input.courts.some((c) => !c.label.trim())
  )
    throw new ServiceError('invalid', {
      session: 'Enter a title, venue, date, time and at least one court.',
    })
  if (end <= start)
    throw new ServiceError('invalid', { schedule: 'The session must end after it starts.' })
  if (
    input.expectedPlayers !== null &&
    (!Number.isInteger(input.expectedPlayers) || input.expectedPlayers < 1)
  )
    throw new ServiceError('invalid', { expectedPlayers: 'Enter a whole number of players.' })
  if (!Number.isInteger(input.minimumGames) || input.minimumGames < 0)
    throw new ServiceError('invalid', { minimumGames: 'Enter a whole number of games.' })
  const club = await tx.club.findUniqueOrThrow({
    where: { id: context.clubId },
    select: { defaultPlayersPerCourt: true },
  })
  const playersPerCourt = input.playersPerCourt ?? club.defaultPlayersPerCourt
  if (!Number.isInteger(playersPerCourt) || playersPerCourt < 2 || playersPerCourt > 20)
    throw new ServiceError('invalid', {
      playersPerCourt: 'Players per court must be between 2 and 20.',
    })
  for (const court of input.courts) {
    if (court.openUntil != null && (ms(court.openUntil) <= Date.now() || ms(court.openUntil) > end))
      throw new ServiceError('invalid', {
        courts: 'Enter a court label and a booking end within the session.',
      })
    const startsAt = plannedStart(court.startsAt, start) ?? start
    const error = courtWindowError(
      startsAt,
      court.openUntil == null ? null : ms(court.openUntil),
      start,
      end,
    )
    if (error) throw new ServiceError('invalid', { courts: Object.values(error)[0] as string })
  }
  return { venue, start, end, playersPerCourt }
}

/** The club's sessions that can clash (not invalid, not cancelled), in the shared rule's shape. */
async function clashCandidates(tx: Tx, context: ClubContext) {
  const rows = await tx.queueSession.findMany({
    where: { clubId: context.clubId, state: { notIn: ['invalid', 'cancelled'] } },
    select: {
      id: true,
      title: true,
      state: true,
      venueId: true,
      venueName: true,
      scheduledStartAt: true,
      scheduledEndAt: true,
    },
  })
  return rows.map(
    (s) =>
      ({
        ...s,
        venueId: s.venueId ?? '',
        venueName: s.venueName ?? '',
        scheduledStartAt: s.scheduledStartAt.getTime(),
        scheduledEndAt: s.scheduledEndAt.getTime(),
      }) as unknown as SessionView,
  )
}

/**
 * Creates one session or a repeating series in one transaction, inserting only dates that do not
 * clash. Repeat-safe: a retried `commandId` returns the sessions it already created.
 */
export async function createQueueSession(
  context: ClubContext,
  commandId: string,
  input: QueueSessionInput,
) {
  await requireClubEntitlement(context)
  const firstCommandId = await derivedId(commandId, 'session:0')
  try {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.queueSession.findUnique({
        where: { sourceCommandId: firstCommandId },
      })
      if (existing) {
        if (existing.clubId !== context.clubId) throw new ServiceError('conflict')
        const created = existing.seriesId
          ? await tx.queueSession.count({
              where: { clubId: context.clubId, seriesId: existing.seriesId },
            })
          : 1
        return { firstSessionId: existing.id, created, skipped: null }
      }
      const { venue, start, end, playersPerCourt } = await validate(tx, context, input)
      const occurrences = sessionOccurrences(
        {
          scheduledStartAt: start,
          scheduledEndAt: end,
          venueId: venue.id,
          repeat: input.repeat,
          occurrences: input.occurrences ?? 0,
        },
        await clashCandidates(tx, context),
      )
      const free = occurrences.filter((o) => !o.clash)
      if (!free.length)
        throw new ServiceError('conflict', {
          schedule:
            occurrences.length > 1
              ? 'Every date clashes with another session. Change the start date, time or venue.'
              : `${occurrences[0]?.clash?.text}. Pick another date or time.`,
        })
      const seriesId = occurrences.length > 1 ? await derivedId(commandId, 'series') : null
      const ids: string[] = []
      for (const [index, date] of occurrences.entries()) {
        if (date.clash) continue
        const id = await derivedId(commandId, `session-id:${index}`)
        ids.push(id)
        let session = await tx.queueSession.create({
          data: {
            id,
            clubId: context.clubId,
            title: input.title.trim(),
            notes: input.notes || null,
            scheduledStartAt: new Date(date.start),
            scheduledEndAt: new Date(date.end),
            venueId: venue.id,
            venueName: venue.name,
            venueAddress: venue.address,
            sessionMode: input.sessionMode,
            allowSingles: input.allowSingles,
            allowDoubles: input.allowDoubles,
            minimumGames: input.minimumGames,
            minimumIsCalculated: input.minimumIsCalculated,
            playersPerCourt,
            expectedPlayers: input.expectedPlayers,
            requestFormats:
              requestFormatsInput(input.requestFormats) ??
              (input.allowSingles ? ['doubles', 'singles'] : ['doubles']),
            seriesId,
            publicSlug: `${publicSlugFor(id)}${id.slice(0, 4)}`,
            sourceCommandId: await derivedId(commandId, `session:${index}`),
          },
        })
        for (const [n, court] of input.courts.entries()) {
          const startsAt = plannedStart(court.startsAt, start)
          // Each date keeps the court's offset from the session start, as openUntil does.
          await tx.sessionCourt.create({
            data: {
              id: await derivedId(commandId, `court:${index}:${n}`),
              clubId: context.clubId,
              sessionId: id,
              label: court.label.trim(),
              startsAt: startsAt === null ? null : new Date(date.start + (startsAt - start)),
              openUntil: court.openUntil
                ? new Date(date.start + (ms(court.openUntil) - start))
                : null,
            },
          })
        }
        session = await recomputeMinimum(tx, session)
      }
      return {
        firstSessionId: ids[0] as string,
        created: ids.length,
        skipped: occurrences.length - ids.length,
      }
    })
  } catch (error) {
    mapDatabaseError(error)
  }
}

/**
 * Q-PREPARE save: prepared sessions only, at the expected revision. Reconciles courts, then applies
 * the new budget first come, first served: entries beyond it are released (kept, never deleted) and
 * moved to the front of the waitlist in their slot order; a larger budget fills from the waitlist.
 */
export async function updateQueueSession(
  context: ClubContext,
  commandId: string,
  sessionId: string,
  expectedRevision: string,
  input: QueueSessionInput,
) {
  await requireClubEntitlement(context)
  try {
    return await prisma.$transaction(async (tx) => {
      let session = await lockSession(tx, context, sessionId)
      requireState(session, ['prepared'], 'Only prepared sessions can be edited.')
      requireRevision(session.revision, expectedRevision)
      const { venue, start, end, playersPerCourt } = await validate(tx, context, input)
      const [date] = sessionOccurrences(
        {
          id: sessionId,
          scheduledStartAt: start,
          scheduledEndAt: end,
          venueId: venue.id,
          repeat: 'none',
        },
        await clashCandidates(tx, context),
      )
      if (date?.clash)
        throw new ServiceError('conflict', {
          schedule: `${date.clash.text}. Pick another date or time.`,
        })
      session = await tx.queueSession.update({
        where: { id: sessionId },
        data: {
          title: input.title.trim(),
          notes: input.notes || null,
          venueId: venue.id,
          venueName: venue.name,
          venueAddress: venue.address,
          scheduledStartAt: new Date(start),
          scheduledEndAt: new Date(end),
          sessionMode: input.sessionMode,
          allowSingles: input.allowSingles,
          allowDoubles: input.allowDoubles,
          minimumGames: input.minimumGames,
          minimumIsCalculated: input.minimumIsCalculated,
          expectedPlayers: input.expectedPlayers,
          playersPerCourt,
          ...(requestFormatsInput(input.requestFormats)
            ? { requestFormats: requestFormatsInput(input.requestFormats) }
            : {}),
          revision: { increment: 1 },
        },
      })

      const now = new Date()
      const kept = new Set(input.courts.map((c) => c.id).filter(Boolean))
      for (const court of await liveCourts(tx, sessionId))
        if (!kept.has(court.id))
          await tx.sessionCourt.update({ where: { id: court.id }, data: { removedAt: now } })
      for (const [n, court] of input.courts.entries()) {
        const startsAt = plannedStart(court.startsAt, start)
        const data = {
          label: court.label.trim(),
          startsAt: startsAt === null ? null : new Date(startsAt),
          openUntil: court.openUntil ? new Date(court.openUntil) : null,
        }
        if (court.id)
          await tx.sessionCourt.update({
            where: { clubId_sessionId_id: { clubId: context.clubId, sessionId, id: court.id } },
            data: { ...data, revision: { increment: 1 } },
          })
        else
          await tx.sessionCourt.create({
            data: {
              id: await derivedId(commandId, `court:${n}`),
              clubId: context.clubId,
              sessionId,
              ...data,
            },
          })
      }

      const capacity = slotCapacity(input.courts.length, playersPerCourt)
      const roster = await liveRoster(tx, sessionId)
      const movedOut = roster.slice(capacity)
      for (const entry of movedOut) {
        await tx.sessionPlayer.update({
          where: { id: entry.id },
          data: { releasedAt: now, releaseReason: 'demoted', revision: { increment: 1 } },
        })
        await tx.sessionWaitlistEntry.create({
          data: {
            id: await derivedId(commandId, `demote:${entry.id}`),
            clubId: context.clubId,
            sessionId,
            clubPlayerId: entry.clubPlayerId,
            skillLevelId: entry.skillLevelId,
            addedAt: entry.joinedAt,
            demotedAt: now,
            demotedConfirmedAt: entry.confirmedAt,
          },
        })
      }
      let movedIn = 0
      if (!movedOut.length)
        for (const waiter of await orderedWaitlist(tx, sessionId)) {
          if (roster.length + movedIn >= capacity) break
          if (waiter.skillLevelId == null) continue
          await promoteWaiter(
            tx,
            context,
            session,
            waiter,
            await derivedId(commandId, `promote:${waiter.id}`),
            now,
          )
          movedIn++
        }
      session = await recomputeMinimum(tx, session)
      return {
        session: sessionDto(session),
        movedToWaitlist: movedOut.length,
        movedFromWaitlist: movedIn,
      }
    })
  } catch (error) {
    mapDatabaseError(error)
  }
}

/**
 * Start: prepared → active under the club's current license term. Refuses while another session is
 * running or any entry lacks a level, freezes the minimum, locks every entry's level and closes every
 * pending join request (`closed`, not declined; D-2026-11-11-11), returning how many closed as
 * `joinRequestsClosed`. A retry after a lost response returns the already-active session (0 closed).
 */
export async function startSession(
  context: ClubContext,
  sessionId: string,
  expectedRevision: string,
  /** ISO end of a late or other-day start (T3): required then, ignored otherwise. */
  newEndAt: string | null = null,
) {
  const entitlement = await requireClubEntitlement(context)
  const newEnd = newEndAt ? ms(newEndAt) : null
  try {
    return await prisma.$transaction(async (tx) => {
      let session = await lockSession(tx, context, sessionId)
      if (session.state === 'active') return { ...sessionDto(session), joinRequestsClosed: 0 }
      requireState(session, ['prepared'], 'Only a prepared session can start.')
      requireRevision(session.revision, expectedRevision)
      const running = await tx.queueSession.findFirst({
        where: {
          clubId: context.clubId,
          id: { not: sessionId },
          state: { in: ['active', 'finalizing'] },
        },
        select: { title: true },
      })
      if (running)
        throw new ServiceError('conflict', {
          session: `${running.title} is already running. One session at a time.`,
        })
      const roster = await liveRoster(tx, sessionId)
      const missing = roster.filter(
        (entry) => entry.skillLevelId == null || !entry.assessmentId,
      ).length
      if (missing)
        throw new ServiceError('invalid', {
          roster: `${missing} player${missing === 1 ? ' needs' : 's need'} a level before you can start.`,
        })
      const now = new Date()
      const plannedStartAt = session.scheduledStartAt.getTime()
      const plannedEndAt = session.scheduledEndAt.getTime()
      const late = startNeedsNewEnd(plannedStartAt, plannedEndAt, now.getTime())
      const endError =
        startNewEndError({
          scheduledStartAt: plannedStartAt,
          scheduledEndAt: plannedEndAt,
          newEndAt: newEnd,
          now: now.getTime(),
        }) ??
        (late && newEnd != null
          ? sessionEndCourtConflict(
              (await liveCourts(tx, sessionId)).map(endCourt),
              newEnd,
              now.getTime(),
              now.getTime(),
            )
          : null)
      if (endError) throw new ServiceError('invalid', { endAt: endError })
      // The minimum freezes from the planned window, before a late start moves the end.
      session = await recomputeMinimum(tx, session)
      for (const entry of roster)
        await tx.sessionPlayer.update({
          where: { id: entry.id },
          data: {
            levelLockedAt: now,
            ...(entry.present ? { presentChangedAt: now } : {}),
            revision: { increment: 1 },
          },
        })
      session = await tx.queueSession.update({
        where: { id: sessionId },
        data: {
          state: 'active',
          startedAt: now,
          ...(late && newEnd != null ? { scheduledEndAt: new Date(newEnd) } : {}),
          startLicenseTermId: entitlement.effectiveTermId,
          revision: { increment: 1 },
        },
      })
      // Join requests end at Start: online requests close; the Queue Master adds late players.
      const closed = await tx.sessionJoinRequest.updateMany({
        where: { clubId: context.clubId, sessionId, status: 'pending' },
        data: { status: 'closed', decidedAt: now },
      })
      return { ...sessionDto(session), joinRequestsClosed: closed.count }
    })
  } catch (error) {
    mapDatabaseError(error)
  }
}

/** Adds a court to a prepared or active session. Repeat-safe on `courtId` (client-generated). */
export async function addCourt(
  context: ClubContext,
  sessionId: string,
  input: { courtId: string; label: string; startsAt: string | null; openUntil: string | null },
) {
  return prisma.$transaction(async (tx) => {
    let session = await lockSession(tx, context, sessionId)
    await requireSessionAccess(context, session, tx)
    requireState(
      session,
      ['prepared', 'active'],
      'Courts can change only before or during the session.',
    )
    const existing = await tx.sessionCourt.findUnique({ where: { id: input.courtId } })
    if (existing) {
      if (existing.sessionId !== sessionId) throw new ServiceError('conflict')
      return courtDto(existing)
    }
    const label = input.label.trim()
    if (!label || label.length > COURT_LABEL_MAX)
      throw new ServiceError('invalid', { court: 'Enter a court label of at most 40 characters.' })
    const base = sessionBase(session)
    const startsAt = plannedStart(input.startsAt, base)
    const openUntil = input.openUntil ? ms(input.openUntil) : null
    const error = courtWindowError(
      startsAt ?? base,
      openUntil,
      base,
      session.scheduledEndAt.getTime(),
    )
    if (error) throw new ServiceError('invalid', error)
    const court = await tx.sessionCourt
      .create({
        data: {
          id: input.courtId,
          clubId: context.clubId,
          sessionId,
          label,
          startsAt: startsAt === null ? null : new Date(startsAt),
          openUntil: openUntil === null ? null : new Date(openUntil),
        },
      })
      .catch(mapDatabaseError)
    session = await touchSession(tx, session)
    await recomputeMinimum(tx, session)
    // Auto Queue: a court added to a running session fills now if it is open (never while prepared).
    await autoFillCourts(tx, session, { operationId: court.id, onlyCourtIds: [court.id] })
    return courtDto(court)
  })
}

/** The live court of a locked session, or a conflict when it was removed meanwhile. */
async function requireLiveCourt(tx: Tx, sessionId: string, courtId: string) {
  const court = (await liveCourts(tx, sessionId)).find((c) => c.id === courtId)
  if (!court) throw new ServiceError('conflict', { court: 'Court no longer available.' })
  return court
}

const COURTS_CHANGED = { court: 'Something changed. Review the courts again.' }

/**
 * Add / Edit court (Change time) on a saved court: label, planned start and advisory end. The start
 * is fixed once the court has hosted a match or been opened early; the end and label stay editable,
 * also while a match is on the court (the match is not touched), and a passed end may still be edited.
 */
export async function updateCourt(
  context: ClubContext,
  sessionId: string,
  courtId: string,
  input: { label: string; startsAt: string | null; openUntil: string | null },
) {
  return prisma.$transaction(async (tx) => {
    let session = await lockSession(tx, context, sessionId)
    await requireSessionAccess(context, session, tx)
    requireState(
      session,
      ['prepared', 'active'],
      'Courts can change only before or during the session.',
    )
    const court = await requireLiveCourt(tx, sessionId, courtId)
    const label = input.label.trim()
    if (!label || label.length > COURT_LABEL_MAX)
      throw new ServiceError('invalid', { court: 'Enter a court label of at most 40 characters.' })
    const base = sessionBase(session)
    const current = court.startsAt?.getTime() ?? base
    const startsAt = input.startsAt ? ms(input.startsAt) : base
    const used =
      court.openedEarlyAt !== null ||
      (await tx.matchCourtUsage.count({ where: { clubId: context.clubId, courtId } })) > 0
    if (used && startsAt !== current)
      throw new ServiceError('invalid', { startsAt: 'Start is fixed after use.' })
    const openUntil = input.openUntil ? ms(input.openUntil) : null
    // A court opened before an early actual start keeps its own start as the earliest bound.
    const error = courtWindowError(
      startsAt,
      openUntil,
      Math.min(base, court.startsAt?.getTime() ?? Infinity),
      session.scheduledEndAt.getTime(),
    )
    if (error) throw new ServiceError('invalid', error)
    const updated = await tx.sessionCourt.update({
      where: { id: courtId },
      data: {
        label,
        startsAt: startsAt === base ? null : new Date(startsAt),
        openUntil: openUntil === null ? null : new Date(openUntil),
        revision: { increment: 1 },
      },
    })
    session = await touchSession(tx, session)
    return courtDto(updated)
  })
}

/** Not open yet: a planned start still ahead and not opened early. */
const notOpenYet = (court: { startsAt: Date | null; openedEarlyAt: Date | null }, now: number) =>
  court.openedEarlyAt === null && (court.startsAt?.getTime() ?? 0) > now

/**
 * Start anyway on running courts: each court not open yet opens now (`courtId` null = all of them).
 * The planned start, costs and minimum games stay as they are. Repeat-safe for one court: a court
 * already opened early is returned as it is.
 */
export async function openCourtsEarly(
  context: ClubContext,
  sessionId: string,
  courtId: string | null,
) {
  return prisma.$transaction(async (tx) => {
    const session = await lockSession(tx, context, sessionId)
    await requireSessionAccess(context, session, tx)
    requireState(session, ['active'], 'Courts open early only during the session.')
    const now = Date.now()
    let courts = (await liveCourts(tx, sessionId)).filter((c) => notOpenYet(c, now))
    if (courtId !== null) {
      const court = await requireLiveCourt(tx, sessionId, courtId)
      if (court.openedEarlyAt !== null) return [courtDto(court)]
      if (!notOpenYet(court, now)) throw new ServiceError('conflict', COURTS_CHANGED)
      courts = [court]
    }
    if (!courts.length) throw new ServiceError('conflict', COURTS_CHANGED)
    const opened: SessionCourt[] = []
    for (const court of courts)
      opened.push(
        await tx.sessionCourt.update({
          where: { id: court.id },
          data: { openedEarlyAt: new Date(now), revision: { increment: 1 } },
        }),
      )
    await touchSession(tx, session)
    // Auto Queue: the courts that just opened get the next eligible matches, same transaction.
    await autoFillCourts(tx, session, {
      operationId: crypto.randomUUID(),
      onlyCourtIds: opened.map((c) => c.id),
    })
    return opened.map(courtDto)
  })
}

/**
 * Undo early open: back to Not open yet, only before the planned start and while no On court or
 * Playing match holds the court. Repeat-safe: a court already not open yet is returned as it is.
 */
export async function undoCourtEarlyOpen(context: ClubContext, sessionId: string, courtId: string) {
  return prisma.$transaction(async (tx) => {
    const session = await lockSession(tx, context, sessionId)
    await requireSessionAccess(context, session, tx)
    requireState(session, ['active'], 'Courts open early only during the session.')
    const now = Date.now()
    const court = await requireLiveCourt(tx, sessionId, courtId)
    if (notOpenYet(court, now)) return courtDto(court)
    if (court.openedEarlyAt === null || (court.startsAt?.getTime() ?? 0) <= now)
      throw new ServiceError('conflict', COURTS_CHANGED)
    if (await tx.activeCourtHold.findUnique({ where: { courtId } }))
      throw new ServiceError('invalid', {
        court: 'Only a free court can go back to Not open yet.',
      })
    const updated = await tx.sessionCourt.update({
      where: { id: courtId },
      data: { openedEarlyAt: null, revision: { increment: 1 } },
    })
    await touchSession(tx, session)
    return courtDto(updated)
  })
}

/**
 * Soft-removes a court, keeping at least one. A court held by an On court or Playing match cannot
 * be removed. No rebalance: an active session never unseats players, and a prepared one
 * rebalances on its next save.
 */
export async function removeCourt(context: ClubContext, sessionId: string, courtId: string) {
  return prisma.$transaction(async (tx) => {
    let session = await lockSession(tx, context, sessionId)
    await requireSessionAccess(context, session, tx)
    requireState(
      session,
      ['prepared', 'active'],
      'Courts can change only before or during the session.',
    )
    const courts = await liveCourts(tx, sessionId)
    const court = courts.find((c) => c.id === courtId)
    if (!court) return null
    // An On court or Playing match holds its court (active_court_holds).
    if (await tx.activeCourtHold.findUnique({ where: { courtId } }))
      throw new ServiceError('invalid', { court: 'Only a free court can be removed' })
    if (courts.length <= 1)
      throw new ServiceError('invalid', { court: 'At least one court must remain.' })
    await tx.sessionCourt.update({
      where: { id: courtId },
      data: { removedAt: new Date(), revision: { increment: 1 } },
    })
    session = await touchSession(tx, session)
    await recomputeMinimum(tx, session)
    return null
  })
}

/** A court as the end-time rule reads it; a null planned start follows the session start. */
const endCourt = (court: SessionCourt) => ({
  label: court.label,
  startsAt: court.startsAt?.getTime(),
  openUntil: court.openUntil?.getTime() ?? null,
  removedAt: null,
})

/**
 * Set end time (T2) under the session lock, the rule `sessionEndError` in `@rotra/data` (live: after
 * now, at most 24 hours after the actual start, which never moves; prepared: the setup window; then
 * the court conflicts). Courts that follow the session end (`openUntil` null) move with it. The end
 * it already has is returned unchanged, so a replay or a retry after a lost reply is repeat-safe.
 * `expectedRevision` is the displayed session online; offline replay sends none.
 */
async function applySessionEnd(
  context: ClubContext,
  sessionId: string,
  expectedRevision: string | null,
  endOf: (session: QueueSession) => number,
) {
  try {
    return await prisma.$transaction(async (tx) => {
      let session: QueueSession = await lockSession(tx, context, sessionId)
      await requireSessionAccess(context, session, tx)
      requireState(
        session,
        ['prepared', 'active'],
        'Only a prepared or running session can change its end.',
      )
      const endAt = endOf(session)
      if (endAt === session.scheduledEndAt.getTime()) return sessionDto(session)
      if (expectedRevision !== null) requireRevision(session.revision, expectedRevision)
      const error = sessionEndError({
        startedAt: session.startedAt?.getTime() ?? null,
        scheduledStartAt: session.scheduledStartAt.getTime(),
        endAt,
        now: Date.now(),
        courts: (await liveCourts(tx, sessionId)).map(endCourt),
      })
      if (error) throw new ServiceError('invalid', { endAt: error })
      session = await tx.queueSession.update({
        where: { id: sessionId },
        data: { scheduledEndAt: new Date(endAt), revision: { increment: 1 } },
      })
      session = await recomputeMinimum(tx, session)
      return sessionDto(session)
    })
  } catch (error) {
    mapDatabaseError(error)
  }
}

/** Courts and time › Set end time to an ISO instant; the no-overlap rule still applies. */
export function setSessionEnd(
  context: ClubContext,
  sessionId: string,
  input: { endAt: string; expectedRevision?: string | null },
) {
  const endAt = ms(input.endAt)
  return applySessionEnd(context, sessionId, input.expectedRevision ?? null, () => endAt)
}

/** Extend 30 / 60 min: Set end time on the saved end plus the minutes, at the expected revision. */
export async function extendSession(
  context: ClubContext,
  sessionId: string,
  expectedRevision: string,
  minutes: 30 | 60,
) {
  if (minutes !== 30 && minutes !== 60)
    throw new ServiceError('invalid', { minutes: 'Choose 30 or 60 minutes.' })
  // A retry after a lost reply would add the minutes again, so the revision stays required here.
  return applySessionEnd(
    context,
    sessionId,
    expectedRevision,
    (session) => session.scheduledEndAt.getTime() + minutes * 60_000,
  )
}

export async function setAcceptJoinRequests(
  context: ClubContext,
  sessionId: string,
  accept: boolean,
) {
  return prisma.$transaction(async (tx) => {
    const session = await lockSession(tx, context, sessionId)
    await requireSessionAccess(context, session, tx)
    const updated = await tx.queueSession.update({
      where: { id: sessionId },
      data: { acceptJoinRequests: accept, revision: { increment: 1 } },
    })
    return sessionDto(updated)
  })
}

/** Always require a request (D-2026-11-12-02, #764): the same write path as Accept join requests. */
export async function setAlwaysRequireRequest(
  context: ClubContext,
  sessionId: string,
  always: boolean,
) {
  return prisma.$transaction(async (tx) => {
    const session = await lockSession(tx, context, sessionId)
    await requireSessionAccess(context, session, tx)
    const updated = await tx.queueSession.update({
      where: { id: sessionId },
      data: { alwaysRequireRequest: always, revision: { increment: 1 } },
    })
    return sessionDto(updated)
  })
}

/** Q-HOME / Q-SESSION counts read the club-scoped persisted match and court-hold rows. */
async function sessionSummaryDto(tx: Tx, session: QueueSession) {
  const [courts, roster, waitlistCount, courtsInUse, gamesPlayed, queuedCount] = await Promise.all([
    liveCourts(tx, session.id),
    liveRoster(tx, session.id),
    tx.sessionWaitlistEntry.count({ where: { sessionId: session.id } }),
    tx.activeCourtHold.count({ where: { clubId: session.clubId, sessionId: session.id } }),
    tx.match.count({
      where: { clubId: session.clubId, sessionId: session.id, state: 'completed' },
    }),
    tx.match.count({
      where: { clubId: session.clubId, sessionId: session.id, state: 'waiting', removedAt: null },
    }),
  ])
  return {
    session: sessionDto(session),
    courts: courts.map(courtDto),
    rosterCount: roster.length,
    presentCount: roster.filter((entry) => entry.present).length,
    capacity: slotCapacity(courts.length, session.playersPerCourt),
    waitlistCount,
    courtsInUse,
    gamesPlayed,
    queuedCount,
  }
}

/** The club's Queue Sessions with their preparation counts (F07.34 read). */
export async function readQueueSessions(context: ClubContext) {
  return prisma.$transaction(async (tx) => {
    const sessions = await tx.queueSession.findMany({
      where: { clubId: context.clubId },
      orderBy: [{ scheduledStartAt: 'asc' }, { id: 'asc' }],
    })
    return Promise.all(sessions.map((session) => sessionSummaryDto(tx, session)))
  })
}

/** One Queue Session with courts and counts; another club's ID is not found. */
export async function readQueueSession(context: ClubContext, sessionId: string) {
  const session = await prisma.queueSession.findUnique({
    where: { clubId_id: { clubId: context.clubId, id: sessionId } },
  })
  if (!session) throw new ServiceError('not_found')
  await requireSessionAccess(context, session)
  return prisma.$transaction(async (tx) => {
    const summary = await sessionSummaryDto(tx, session)
    // Live: Match requests · N, the open match requests whose named players are all present.
    if (session.state !== 'active') return summary
    return { ...summary, requestCount: (await liveOpenRequests(tx, session.id)).length }
  })
}
