import 'server-only'
import type {
  QueueSession,
  SessionCourt,
  SessionJoinRequest,
  SessionPlayer,
  SessionWaitlistEntry,
} from '../generated/prisma/client'
import { toDecimalString, toIso, toIsoOrNull } from '../service/serialize'
import { levelCodeFor } from './session-store'

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
    /** Manual Queue | Auto Queue (default manual). */
    courtFillMode: session.courtFillMode,
    revision: toDecimalString(session.revision),
  }
}

export function courtDto(court: SessionCourt) {
  return {
    id: court.id,
    sessionId: court.sessionId,
    label: court.label,
    /** Planned start; null means the session start. */
    startsAt: toIsoOrNull(court.startsAt),
    openedEarlyAt: toIsoOrNull(court.openedEarlyAt),
    openUntil: toIsoOrNull(court.openUntil),
    removedAt: toIsoOrNull(court.removedAt),
  }
}

export function rosterEntryDto(entry: SessionPlayer, nickname: string | null) {
  return {
    id: entry.id,
    sessionId: entry.sessionId,
    clubPlayerId: entry.clubPlayerId,
    nameSnapshot: entry.nameSnapshot,
    nicknameSnapshot: nickname,
    present: entry.present,
    presentChangedAt: toIso(entry.presentChangedAt),
    level: levelCodeFor(entry.skillLevelId),
    levelLockedAt: toIsoOrNull(entry.levelLockedAt),
    confirmedAt: toIso(entry.confirmedAt),
    gamesAdjustment: entry.gamesAdjustment,
    revision: toDecimalString(entry.revision),
  }
}

export function waitlistDto(entry: SessionWaitlistEntry, position: number) {
  return {
    id: entry.id,
    sessionId: entry.sessionId,
    clubPlayerId: entry.clubPlayerId,
    level: levelCodeFor(entry.skillLevelId),
    addedAt: toIso(entry.addedAt),
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
