import type { QueueSession, SessionCourt } from '../queue-session/queueSession.types'
import type { SessionPlayer } from '../session-roster/sessionRoster.types'
import { DEMO_CLUB_ID } from './clubs'
import { clubPlayers } from './players'
import { venues } from './venues'
/** Same relative dates as seedSessions/PAST; reset uses a new seed time. */
export function createQueueFixtures(now = Date.now()) {
  const at = (days: number, hour: number) => {
    const date = new Date(now)
    date.setDate(date.getDate() + days)
    date.setHours(hour, 0, 0, 0)
    return date.getTime()
  }
  const venue = venues[0],
    other = venues[1]
  if (!venue || !other) throw new Error('Missing venue fixtures.')
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
    seriesId: null,
    publicSlug: 's-tonight',
    acceptJoinRequests: true,
  }
  const sessions: QueueSession[] = [
    tonight,
    {
      ...tonight,
      id: 'h1',
      publicSlug: 'h1',
      title: 'Thursday Open Play',
      scheduledStartAt: at(-3, 19),
      scheduledEndAt: at(-3, 22),
      state: 'completed',
      acceptJoinRequests: false,
    },
    {
      ...tonight,
      id: 'h2',
      publicSlug: 'h2',
      scheduledStartAt: at(-7, 18),
      scheduledEndAt: at(-7, 21),
      state: 'completed',
      acceptJoinRequests: false,
    },
    {
      ...tonight,
      id: 'h3',
      publicSlug: 'h3',
      title: 'Tuesday Drills',
      scheduledStartAt: at(-12, 19),
      scheduledEndAt: at(-12, 21),
      venueId: other.id,
      venueName: other.name,
      venueAddress: other.address,
      state: 'invalid',
      invalidReason:
        'The original device was lost before its records synced, so this session could not be recorded.',
      acceptJoinRequests: false,
    },
  ]
  const courts: SessionCourt[] = sessions.flatMap((s) =>
    [1, 2, 3].map((n) => ({
      id: `${s.id}-court-${n}`,
      sessionId: s.id,
      label: `Court ${n}`,
      openUntil: null,
      removedAt: null,
    })),
  )
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
  return { sessions, courts, roster }
}
export const queueSessionFixtures = createQueueFixtures()
export const liveSessionFixture = {
  ...queueSessionFixtures.sessions[0],
  state: 'active' as const,
  startedAt: Date.now(),
}
