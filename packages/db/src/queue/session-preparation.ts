import 'server-only'
import {
  publicSlugFor,
  sessionOccurrences,
  slotCapacity,
} from '@rotra/data/queue-session/queueSession.rules'
import type { QueueSession as SessionView } from '@rotra/data/queue-session/types'
import type { ClubContext } from '../auth/account-context'
import { prisma } from '../client/prisma'
import type { QueueSession, SessionMode } from '../generated/prisma/client'
import { requireClubEntitlement, requireRevision } from '../service/authorize'
import { ServiceError } from '../service/errors'
import { courtDto, sessionDto } from './dto'
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
  /** `id` keeps an existing court on edit; courts left out are removed. */
  courts: { id?: string; label: string; openUntil?: string | null }[]
  repeat?: 'none' | 'weekly' | 'biweekly' | 'monthly'
  occurrences?: number
}

const ms = (iso: string) => {
  const value = Date.parse(iso)
  if (!Number.isFinite(value))
    throw new ServiceError('invalid', { schedule: 'Enter a date and time.' })
  return value
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
  for (const court of input.courts)
    if (court.openUntil != null && (ms(court.openUntil) <= Date.now() || ms(court.openUntil) > end))
      throw new ServiceError('invalid', {
        courts: 'Enter a court label and a booking end within the session.',
      })
  return { venue, start, end, playersPerCourt }
}

/** The club's non-invalid sessions, in the shape the shared clash rule reads. */
async function clashCandidates(tx: Tx, context: ClubContext) {
  const rows = await tx.queueSession.findMany({
    where: { clubId: context.clubId, state: { not: 'invalid' } },
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
            seriesId,
            publicSlug: `${publicSlugFor(id)}${id.slice(0, 4)}`,
            sourceCommandId: await derivedId(commandId, `session:${index}`),
          },
        })
        for (const [n, court] of input.courts.entries())
          await tx.sessionCourt.create({
            data: {
              id: await derivedId(commandId, `court:${index}:${n}`),
              clubId: context.clubId,
              sessionId: id,
              label: court.label.trim(),
              openUntil: court.openUntil
                ? new Date(date.start + (ms(court.openUntil) - start))
                : null,
            },
          })
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
          revision: { increment: 1 },
        },
      })

      const now = new Date()
      const kept = new Set(input.courts.map((c) => c.id).filter(Boolean))
      for (const court of await liveCourts(tx, sessionId))
        if (!kept.has(court.id))
          await tx.sessionCourt.update({ where: { id: court.id }, data: { removedAt: now } })
      for (const [n, court] of input.courts.entries()) {
        const data = {
          label: court.label.trim(),
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
 * running or any entry lacks a level, freezes the minimum, and locks every entry's level. A retry
 * after a lost response returns the already-active session.
 */
export async function startSession(
  context: ClubContext,
  sessionId: string,
  expectedRevision: string,
) {
  const entitlement = await requireClubEntitlement(context)
  try {
    return await prisma.$transaction(async (tx) => {
      let session = await lockSession(tx, context, sessionId)
      if (session.state === 'active') return sessionDto(session)
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
      session = await recomputeMinimum(tx, session)
      const now = new Date()
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
          startLicenseTermId: entitlement.effectiveTermId,
          revision: { increment: 1 },
        },
      })
      return sessionDto(session)
    })
  } catch (error) {
    mapDatabaseError(error)
  }
}

/** Adds a court to a prepared or active session. Repeat-safe on `courtId` (client-generated). */
export async function addCourt(
  context: ClubContext,
  sessionId: string,
  input: { courtId: string; label: string; openUntil: string | null },
) {
  return prisma.$transaction(async (tx) => {
    let session = await lockSession(tx, context, sessionId)
    await requireSessionAccess(context, session)
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
    const openUntil = input.openUntil ? ms(input.openUntil) : null
    if (
      !input.label.trim() ||
      (openUntil !== null &&
        (openUntil <= Date.now() || openUntil > session.scheduledEndAt.getTime()))
    )
      throw new ServiceError('invalid', {
        court: 'Enter a court label and a booking end within the session.',
      })
    const court = await tx.sessionCourt
      .create({
        data: {
          id: input.courtId,
          clubId: context.clubId,
          sessionId,
          label: input.label.trim(),
          openUntil: openUntil === null ? null : new Date(openUntil),
        },
      })
      .catch(mapDatabaseError)
    session = await touchSession(tx, session)
    await recomputeMinimum(tx, session)
    return courtDto(court)
  })
}

/**
 * Soft-removes a court, keeping at least one. Courts in use by an active match cannot be removed;
 * that check joins the match holds when the match schema lands. No rebalance: an active session
 * never unseats players, and a prepared one rebalances on its next save.
 */
export async function removeCourt(context: ClubContext, sessionId: string, courtId: string) {
  return prisma.$transaction(async (tx) => {
    let session = await lockSession(tx, context, sessionId)
    await requireSessionAccess(context, session)
    requireState(
      session,
      ['prepared', 'active'],
      'Courts can change only before or during the session.',
    )
    const courts = await liveCourts(tx, sessionId)
    const court = courts.find((c) => c.id === courtId)
    if (!court) return null
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

/** Extends the end by 30 or 60 minutes at the expected revision; the no-overlap rule still applies. */
export async function extendSession(
  context: ClubContext,
  sessionId: string,
  expectedRevision: string,
  minutes: 30 | 60,
) {
  if (minutes !== 30 && minutes !== 60)
    throw new ServiceError('invalid', { minutes: 'Choose 30 or 60 minutes.' })
  try {
    return await prisma.$transaction(async (tx) => {
      let session: QueueSession = await lockSession(tx, context, sessionId)
      await requireSessionAccess(context, session)
      requireState(
        session,
        ['prepared', 'active'],
        'Only a prepared or running session can be extended.',
      )
      requireRevision(session.revision, expectedRevision)
      session = await tx.queueSession.update({
        where: { id: sessionId },
        data: {
          scheduledEndAt: new Date(session.scheduledEndAt.getTime() + minutes * 60_000),
          revision: { increment: 1 },
        },
      })
      session = await recomputeMinimum(tx, session)
      return sessionDto(session)
    })
  } catch (error) {
    mapDatabaseError(error)
  }
}

export async function setAcceptJoinRequests(
  context: ClubContext,
  sessionId: string,
  accept: boolean,
) {
  return prisma.$transaction(async (tx) => {
    const session = await lockSession(tx, context, sessionId)
    await requireSessionAccess(context, session)
    const updated = await tx.queueSession.update({
      where: { id: sessionId },
      data: { acceptJoinRequests: accept, revision: { increment: 1 } },
    })
    return sessionDto(updated)
  })
}
