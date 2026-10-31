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
    revision: toDecimalString(session.revision),
  }
}

export function courtDto(court: SessionCourt) {
  return {
    id: court.id,
    sessionId: court.sessionId,
    label: court.label,
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
export function joinRequestDto(request: SessionJoinRequest) {
  return {
    id: request.id,
    sessionId: request.sessionId,
    name: request.name,
    nickname: request.nickname,
    phoneE164: request.phoneE164,
    statedBand: request.statedBand,
    status: request.status,
    requestedAt: toIso(request.requestedAt),
    decidedAt: toIsoOrNull(request.decidedAt),
    clubPlayerId: request.clubPlayerId,
  }
}
