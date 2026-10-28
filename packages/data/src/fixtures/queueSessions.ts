import { publicSlugFor } from '../queue-session/queueSession.rules'
import type { QueueSession, SessionCourt } from '../queue-session/queueSession.types'
import type { SessionPlayer } from '../session-roster/sessionRoster.types'
import { DEMO_CLUB_ID } from './clubs'
import { clubPlayers } from './players'
import { createSessionHistoryFixtures } from './sessionHistory'
import { venues } from './venues'
/** Same relative dates as seedSessions/PAST and ensureHistory; reset uses a new seed time. */
export function createQueueFixtures(now = Date.now()) {
  const at = (days: number, hour: number) => {
    const date = new Date(now)
    date.setDate(date.getDate() + days)
    date.setHours(hour, 0, 0, 0)
    return date.getTime()
  }
  const venue = venues[0]
  if (!venue) throw new Error('Missing venue fixtures.')
  const tonight: QueueSession = {
    id: 's-tonight',
    clubId: DEMO_CLUB_ID,
    title: 'Sunday Night Queue',
    notes: 'Open play for club regulars and guests. Bring your own racket; shuttles provided.',
    scheduledStartAt: at(0, 18),
    scheduledEndAt: at(0, 21),
    venueId: venue.id,
    venueName: venue.name,
    venueAddress: venue.address,
    state: 'prepared',
    invalidReason: null,
    sessionMode: 'fair',
    allowSingles: false,
    allowDoubles: true,
    minimumGames: 4,
    minimumIsCalculated: false,
    playersPerCourt: 8,
    expectedPlayers: 12,
    startedAt: null,
    finalizedAt: null,
    playerRecordsUpdatedAt: null,
    seriesId: null,
    publicSlug: publicSlugFor('s-tonight'),
    acceptJoinRequests: true,
  }
  const history = createSessionHistoryFixtures(now)
  const sessions: QueueSession[] = [tonight, ...history.sessions]
  const courts: SessionCourt[] = [
    ...[1, 2, 3].map((n) => ({
      id: `${tonight.id}-court-${n}`,
      sessionId: tonight.id,
      label: `Court ${n}`,
      openUntil: null,
      removedAt: null,
    })),
    ...history.courts,
  ]
  const roster: SessionPlayer[] = clubPlayers.slice(0, 14).map((p, i) => ({
    id: `s-tonight-player-${i + 1}`,
    sessionId: tonight.id,
    clubPlayerId: p.id,
    nameSnapshot: p.fullName,
    nicknameSnapshot: p.nickname,
    present: i < 10,
    presentChangedAt: i < 10 ? now : null,
    level:
      i === 5
        ? null
        : i === 7
          ? 'intermediate_low'
          : i === 11
            ? 'intermediate_low'
            : p.playingLevel,
    levelLockedAt: null,
    confirmedAt: now - 14 + i,
  }))
  /** `roster` is tonight's only; the past sessions' rosters, matches and finalizations live under `history`. */
  return { sessions, courts, roster, history }
}
export const queueSessionFixtures = createQueueFixtures()
export const liveSessionFixture = {
  ...queueSessionFixtures.sessions[0],
  state: 'active' as const,
  startedAt: Date.now(),
}
