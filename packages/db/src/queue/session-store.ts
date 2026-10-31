import 'server-only'
import { PLAYING_LEVELS, type PlayingLevel } from '@rotra/data/player/types'
import {
  estimateMinimum,
  sessionMinutes,
  slotCapacity,
} from '@rotra/data/queue-session/queueSession.rules'
import type { ClubContext } from '../auth/account-context'
import type { Prisma, QueueSession } from '../generated/prisma/client'
import { requireClubEntitlement } from '../service/authorize'
import { denyScope, ServiceError } from '../service/errors'

export type Tx = Prisma.TransactionClient

/**
 * Locks the club's session row for the rest of the transaction (`FOR UPDATE`), so admissions,
 * budget changes and start are serialized per session. Another club's session ID is `not_found`.
 */
export async function lockSession(tx: Tx, context: ClubContext, sessionId: string) {
  const rows = await tx.$queryRaw<{ id: string }[]>`
    SELECT "id" FROM "queue_sessions"
    WHERE "club_id" = ${context.clubId}::uuid AND "id" = ${sessionId}::uuid
    FOR UPDATE`
  if (!rows.length) denyScope()
  return tx.queueSession.findUniqueOrThrow({
    where: { clubId_id: { clubId: context.clubId, id: sessionId } },
  })
}

/** Bumps the session revision after any change to it or its roster, courts or waitlist. */
export function touchSession(tx: Tx, session: QueueSession) {
  return tx.queueSession.update({
    where: { id: session.id },
    data: { revision: { increment: 1 } },
  })
}

/**
 * Club access for preparation writes. An active session may keep running after expiry (the
 * active-session completion exception), but only under the term that authorized its start.
 */
export async function requireSessionAccess(context: ClubContext, session: QueueSession) {
  if (session.state === 'active' && session.startLicenseTermId) return
  await requireClubEntitlement(context)
}

export function requireState(
  session: QueueSession,
  states: QueueSession['state'][],
  message: string,
) {
  if (!states.includes(session.state)) throw new ServiceError('invalid', { state: message })
}

/** `skill_levels` is seeded so that id = display order = index in PLAYING_LEVELS. */
export function levelIdFor(level: string): number {
  const id = PLAYING_LEVELS.indexOf(level as PlayingLevel)
  if (id < 0)
    throw new ServiceError('invalid', { level: 'Choose a level for this club before confirming.' })
  return id
}

export function levelCodeFor(id: number | null): PlayingLevel | null {
  return id == null ? null : (PLAYING_LEVELS[id] ?? null)
}

export function liveCourts(tx: Tx, sessionId: string) {
  return tx.sessionCourt.findMany({
    where: { sessionId, removedAt: null },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  })
}

/** Live roster entries (not released) in slot order: confirmed_at, then id. */
export function liveRoster(tx: Tx, sessionId: string) {
  return tx.sessionPlayer.findMany({
    where: { sessionId, releasedAt: null },
    orderBy: [{ confirmedAt: 'asc' }, { id: 'asc' }],
  })
}

/**
 * Waitlist order (physical-schema.md, proposal pending #245): demoted entries first, latest demotion
 * batch at the front, each batch in original slot order; then everyone else by arrival; id last.
 */
export async function orderedWaitlist(tx: Tx, sessionId: string) {
  const rows = await tx.sessionWaitlistEntry.findMany({ where: { sessionId } })
  return rows.sort((a, b) => {
    if (a.demotedAt && b.demotedAt) {
      const batch = b.demotedAt.getTime() - a.demotedAt.getTime()
      if (batch) return batch
      const slot = (a.demotedConfirmedAt?.getTime() ?? 0) - (b.demotedConfirmedAt?.getTime() ?? 0)
      if (slot) return slot
    } else if (a.demotedAt || b.demotedAt) return a.demotedAt ? -1 : 1
    return a.addedAt.getTime() - b.addedAt.getTime() || a.id.localeCompare(b.id)
  })
}

export async function capacityOf(tx: Tx, session: QueueSession) {
  return slotCapacity((await liveCourts(tx, session.id)).length, session.playersPerCourt)
}

/** While prepared with a calculated minimum, recompute it from courts, length, players and formats. */
export async function recomputeMinimum(tx: Tx, session: QueueSession) {
  if (session.state !== 'prepared' || !session.minimumIsCalculated) return session
  const courts = (await liveCourts(tx, session.id)).length
  const rosterCount = await tx.sessionPlayer.count({
    where: { sessionId: session.id, releasedAt: null },
  })
  const minimumGames = estimateMinimum({
    courts,
    minutes: sessionMinutes(session.scheduledStartAt.getTime(), session.scheduledEndAt.getTime()),
    players:
      rosterCount || session.expectedPlayers || slotCapacity(courts, session.playersPerCourt),
    allowSingles: session.allowSingles,
    allowDoubles: session.allowDoubles,
  }).low
  if (minimumGames === session.minimumGames) return session
  return tx.queueSession.update({ where: { id: session.id }, data: { minimumGames } })
}

/**
 * Appends an assessment for this exact roster entry and selects it, superseding the entry's
 * previous selection. Repeat-safe on `operationId`. Refused once the entry's level is locked.
 */
export async function assessEntry(
  tx: Tx,
  context: ClubContext,
  entry: {
    id: string
    sessionId: string
    clubPlayerId: string
    playerIdAtEntry: string | null
    assessmentId: string | null
    levelLockedAt: Date | null
  },
  skillLevelId: number,
  operationId: string,
  now: Date,
) {
  const existing = await tx.clubAssessment.findUnique({ where: { sourceOperationId: operationId } })
  if (existing) {
    if (existing.sessionPlayerId !== entry.id) throw new ServiceError('conflict')
    return existing
  }
  if (entry.levelLockedAt)
    throw new ServiceError('invalid', { level: 'Levels are locked after the session starts.' })
  const session = await tx.queueSession.findUniqueOrThrow({
    where: { id: entry.sessionId },
    select: { revision: true },
  })
  const assessment = await tx.clubAssessment.create({
    data: {
      id: crypto.randomUUID(),
      clubId: context.clubId,
      clubPlayerId: entry.clubPlayerId,
      sessionId: entry.sessionId,
      sessionPlayerId: entry.id,
      playerIdAtAssessment: entry.playerIdAtEntry,
      skillLevelId,
      supersedesId: entry.assessmentId,
      sourceOperationId: operationId,
      assessedAt: now,
      acceptedRevision: session.revision,
      actorClubId: context.clubId,
    },
  })
  await tx.sessionPlayer.update({
    where: { id: entry.id },
    data: { assessmentId: assessment.id, skillLevelId, revision: { increment: 1 } },
  })
  return assessment
}

/** Maps constraint failures to service errors; the database is the backstop for races. */
export function mapDatabaseError(error: unknown): never {
  const code = (error as { code?: string; meta?: { code?: string } })?.code
  const dbCode =
    (error as { meta?: { code?: string } })?.meta?.code ??
    (error as { cause?: { code?: string } })?.cause?.code
  if (code === 'P2002' || dbCode === '23505' || dbCode === '23P01')
    throw new ServiceError('conflict')
  if (code === 'P2003' || dbCode === '23503') throw new ServiceError('invalid')
  if (code === 'P2025') throw new ServiceError('not_found')
  throw error
}

/** A stable UUID derived from a command ID, for the extra rows one command writes (series, moves). */
export async function derivedId(commandId: string, part: string): Promise<string> {
  const bytes = new Uint8Array(
    await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${commandId}:${part}`)),
  ).slice(0, 16)
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x80 // version 8 (custom)
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

/**
 * Gives a waitlisted player a slot: deletes the waitlist row and reactivates that player's released
 * roster entry (keeping its paid marks and assessments) or inserts a new one, then selects an
 * assessment for the waitlist level. In an active session the entry is present and its level locks.
 */
export async function promoteWaiter(
  tx: Tx,
  context: ClubContext,
  session: QueueSession,
  waiter: { id: string; clubPlayerId: string; skillLevelId: number | null },
  operationId: string,
  now: Date,
  overBudget = false,
) {
  if (waiter.skillLevelId == null)
    throw new ServiceError('invalid', { level: 'Choose a level before giving a slot.' })
  const clubPlayer = await tx.clubPlayer.findUniqueOrThrow({
    where: { clubId_id: { clubId: context.clubId, id: waiter.clubPlayerId } },
  })
  await tx.sessionWaitlistEntry.delete({ where: { id: waiter.id } })
  const active = session.state === 'active'
  const released = await tx.sessionPlayer.findUnique({
    where: { sessionId_clubPlayerId: { sessionId: session.id, clubPlayerId: clubPlayer.id } },
  })
  const entry = released
    ? await tx.sessionPlayer.update({
        where: { id: released.id },
        data: {
          releasedAt: null,
          releaseReason: null,
          confirmedAt: now,
          present: active,
          presentChangedAt: now,
          overBudgetAt: overBudget ? now : null,
          revision: { increment: 1 },
        },
      })
    : await tx.sessionPlayer.create({
        data: {
          id: await derivedId(operationId, 'entry'),
          clubId: context.clubId,
          sessionId: session.id,
          clubPlayerId: clubPlayer.id,
          playerIdAtEntry: clubPlayer.playerId,
          nameSnapshot: clubPlayer.displayName,
          present: active,
          presentChangedAt: now,
          confirmedAt: now,
          joinedAt: now,
          overBudgetAt: overBudget ? now : null,
        },
      })
  // Each admission records its level as new assessment evidence, keyed on the operation.
  await assessEntry(tx, context, entry, waiter.skillLevelId, operationId, now)
  if (active)
    await tx.sessionPlayer.update({ where: { id: entry.id }, data: { levelLockedAt: now } })
  return tx.sessionPlayer.findUniqueOrThrow({ where: { id: entry.id } })
}
