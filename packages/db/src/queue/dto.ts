import 'server-only'
import type { MatchFormat } from '@rotra/data/match/types'
import { REQUEST_FORMAT_ORDER } from '@rotra/data/match-request/rules'
import type { RequestFormats } from '@rotra/data/queue-session/types'
import {
  LEVEL_SLOTS_NUMBER_ERROR,
  type LevelRestriction,
  levelRestrictionField,
  levelRestrictionOf,
  levelSlotsError,
} from '@rotra/schema/level-restriction'
import type {
  QueueSession,
  SessionCourt,
  SessionJoinRequest,
  SessionPlayer,
  SessionWaitlistEntry,
} from '../generated/prisma/client'
import { ServiceError } from '../service/errors'
import { toDecimalString, toIso, toIsoOrNull } from '../service/serialize'
import { levelCodeFor, type RosterNames } from './session-store'

/** The stored Players can request list as the `RequestFormats` switches every format has. */
export const requestFormatsRecord = (formats: readonly MatchFormat[]) =>
  Object.fromEntries(
    REQUEST_FORMAT_ORDER.map((format) => [format, formats.includes(format)]),
  ) as RequestFormats

/**
 * Players can request from a request body: the `RequestFormats` switches (or a list of formats).
 * `undefined` when the body leaves it out or sends something malformed (the stored set stays).
 */
export function requestFormatsInput(value: unknown): MatchFormat[] | undefined {
  if (value === undefined || value === null) return undefined
  if (Array.isArray(value)) {
    if (value.every((f) => REQUEST_FORMAT_ORDER.includes(f as MatchFormat)))
      return REQUEST_FORMAT_ORDER.filter((f) => value.includes(f))
  } else if (typeof value === 'object') {
    const record = value as Record<string, unknown>
    if (Object.values(record).every((on) => typeof on === 'boolean'))
      return REQUEST_FORMAT_ORDER.filter((f) => record[f] === true)
  }
  return undefined
}

const RESTRICTION_KIND = {
  all: 'all',
  beginners: 'beginners',
  beginners_intermediate: 'beginners-intermediate',
  slots_per_band: 'per-level',
} as const satisfies Record<QueueSession['levelRestriction'], LevelRestriction['kind']>

/**
 * Restrictions (D-2026-11-19-12) as the apps read it: the stored pick, with the three slot counts
 * only for Slots per level.
 */
export function levelRestrictionDto(
  session: Pick<
    QueueSession,
    'levelRestriction' | 'beginnerSlots' | 'intermediateSlots' | 'advancedSlots'
  >,
): LevelRestriction {
  const kind = RESTRICTION_KIND[session.levelRestriction]
  if (kind !== 'per-level') return { kind }
  return {
    kind,
    slots: {
      beginner: session.beginnerSlots ?? 0,
      intermediate: session.intermediateSlots ?? 0,
      advanced: session.advancedSlots ?? 0,
    },
  }
}

/**
 * Restrictions from a request body, as the columns to write. `undefined` when the body leaves it
 * out (the stored pick stays). Refuses an unknown pick, and slots per level that are not whole
 * numbers of 0 or more adding up to the session's slots (`courts` × `playersPerCourt`).
 */
export function levelRestrictionInput(value: unknown, courts: number, playersPerCourt: number) {
  if (value === undefined || value === null) return undefined
  const parsed = levelRestrictionField.safeParse(value)
  if (!parsed.success) {
    const slots = parsed.error.issues.some((issue) => issue.path[0] === 'slots')
    throw new ServiceError('invalid', {
      levelRestriction: slots ? LEVEL_SLOTS_NUMBER_ERROR : 'Choose which levels can take a slot.',
    })
  }
  const error = levelSlotsError(parsed.data, courts, playersPerCourt)
  if (error) throw new ServiceError('invalid', { levelRestriction: error })
  const { kind, slots } = levelRestrictionOf(parsed.data)
  const stored = (Object.keys(RESTRICTION_KIND) as QueueSession['levelRestriction'][]).find(
    (key) => RESTRICTION_KIND[key] === kind,
  ) as QueueSession['levelRestriction']
  return {
    levelRestriction: stored,
    beginnerSlots: slots?.beginner ?? null,
    intermediateSlots: slots?.intermediate ?? null,
    advancedSlots: slots?.advanced ?? null,
  }
}

/** Club-only session view. No cost, payment or private intake fields. */
export function sessionDto(session: QueueSession) {
  return {
    id: session.id,
    clubId: session.clubId,
    title: session.title,
    notes: session.notes ?? '',
    scheduledStartAt: toIso(session.scheduledStartAt),
    scheduledEndAt: toIso(session.scheduledEndAt),
    venueId: session.venueId,
    venueName: session.venueName ?? '',
    venueAddress: session.venueAddress ?? '',
    state: session.state,
    invalidReason: session.invalidReason,
    cancelledAt: toIsoOrNull(session.cancelledAt),
    cancelReason: session.cancelReason,
    sessionMode: session.sessionMode,
    allowSingles: session.allowSingles,
    allowDoubles: session.allowDoubles,
    minimumGames: session.minimumGames,
    minimumIsCalculated: session.minimumIsCalculated,
    playersPerCourt: session.playersPerCourt,
    expectedPlayers: session.expectedPlayers,
    startedAt: toIsoOrNull(session.startedAt),
    finalizedAt: toIsoOrNull(session.finalizedAt),
    seriesId: session.seriesId,
    publicSlug: session.publicSlug,
    acceptJoinRequests: session.acceptJoinRequests,
    /** Always require a request (D-2026-11-12-02); default false. */
    alwaysRequireRequest: session.alwaysRequireRequest,
    /** Manual Queue | Auto Queue (default manual). */
    courtFillMode: session.courtFillMode,
    /** Players can request (D-2026-11-09-05): one switch per format */
    requestFormats: requestFormatsRecord(session.requestFormats),
    /** Record games (D-2026-11-20-02): false = not ranked (results kept); fixed once the session starts. */
    recordGames: session.recordGames,
    /** Restrictions (D-2026-11-19-12): which levels may take a slot; default All levels. */
    levelRestriction: levelRestrictionDto(session),
    revision: toDecimalString(session.revision),
  }
}

export function courtDto(court: SessionCourt) {
  return {
    id: court.id,
    sessionId: court.sessionId,
    label: court.label,
    /** Court order in the session, from 1 (owner decision, 2026-11-25). */
    position: court.position,
    /** Planned start; null means the session start. */
    startsAt: toIsoOrNull(court.startsAt),
    openedEarlyAt: toIsoOrNull(court.openedEarlyAt),
    openUntil: toIsoOrNull(court.openUntil),
    removedAt: toIsoOrNull(court.removedAt),
  }
}

/**
 * A Queue Master roster row (Q-ROSTER): club-scoped, never a public or player read. `names` from
 * `rosterNamesOf`: the nickname players see, and the club nickname of a registered player
 * (D-2026-11-18-03), which only this club's Queue Master reads carry.
 */
export function rosterEntryDto(entry: SessionPlayer, names: RosterNames | null) {
  return {
    id: entry.id,
    sessionId: entry.sessionId,
    clubPlayerId: entry.clubPlayerId,
    nameSnapshot: entry.nameSnapshot,
    nicknameSnapshot: names?.nickname ?? null,
    clubNickname: names?.clubNickname ?? null,
    present: entry.present,
    presentChangedAt: toIso(entry.presentChangedAt),
    level: levelCodeFor(entry.skillLevelId),
    levelLockedAt: toIsoOrNull(entry.levelLockedAt),
    confirmedAt: toIso(entry.confirmedAt),
    gamesAdjustment: entry.gamesAdjustment,
    selfCheckedInAt: toIsoOrNull(entry.selfCheckedInAt),
    leftAt: toIsoOrNull(entry.leftAt),
    revision: toDecimalString(entry.revision),
  }
}

export function waitlistDto(entry: SessionWaitlistEntry, position: number) {
  return {
    id: entry.id,
    sessionId: entry.sessionId,
    clubPlayerId: entry.clubPlayerId,
    level: levelCodeFor(entry.skillLevelId),
    /** When they joined the waitlist (the move time for a player moved off the roster). */
    addedAt: toIso(entry.demotedAt ?? entry.addedAt),
    position,
  }
}

/** Club view of a join request. The phone is the club's to see, never the public page's. */
export function joinRequestDto(
  request: SessionJoinRequest & { player?: { avatarRef: string | null; fullName: string } | null },
) {
  return {
    id: request.id,
    sessionId: request.sessionId,
    name: request.name,
    nickname: request.nickname,
    phoneE164: request.phoneE164,
    statedBand: request.statedBand,
    /** The player's choice (D-2026-11-11-02): slot, waitlist or from_waitlist */
    placement: request.placement,
    status: request.status,
    requestedAt: toIso(request.requestedAt),
    decidedAt: toIsoOrNull(request.decidedAt),
    clubPlayerId: request.clubPlayerId,
    /** Set when a signed-in ROTRA Player sent it (D-2026-11-09-02) */
    playerId: request.playerId,
    /** The requesting Player's profile picture (avatar reference); null for a guest */
    picture: request.player?.avatarRef ?? null,
    /** The Player's current full name, the character picture's seed */
    pictureName: request.player?.fullName ?? null,
  }
}
