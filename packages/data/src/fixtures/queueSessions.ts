import type { MatchRequest } from '../match-request/matchRequest.types'
import { publicSlugFor } from '../queue-session/queueSession.rules'
import type { QueueSession, SessionCourt } from '../queue-session/queueSession.types'
import type {
  DropOutNotice,
  SessionInviteCode,
  SessionPlayer,
} from '../session-roster/sessionRoster.types'
import { DEMO_CLUB_ID } from './clubs'
import {
  createAccountJoinRequestFixture,
  createRequestSeedClubPlayers,
  createSessionPageJoinRequestFixtures,
  KIKO_CLUB_PLAYER_ID,
  KIKO_PHONE_E164,
  PAOLO_PLAYER,
  RHEA_PLAYER,
  TONIGHT_INVITE_CODE_ID,
} from './joinRequests'
import { clubPlayers, JOSE_PLAYER_ID } from './players'
import { createSessionHistoryFixtures } from './sessionHistory'
import { venues } from './venues'
/** Same relative dates as seedSessions/PAST and ensureHistory; reset uses a new seed time. */
export function createQueueFixtures(now = Date.now()) {
  const at = (days: number, hour: number, minute = 0) => {
    const date = new Date(now)
    date.setDate(date.getDate() + days)
    date.setHours(hour, minute, 0, 0)
    return date.getTime()
  }
  const venue = venues.find((v) => v.name === 'Mactan Poona Zone')
  if (!venue) throw new Error('Missing Mactan Poona Zone venue fixture.')
  const tonight: QueueSession = {
    id: 's-tonight',
    clubId: DEMO_CLUB_ID,
    title: 'Sunday Night Queue',
    notes: 'Open play for club regulars and guests. Bring your own racket; shuttles provided.',
    scheduledStartAt: at(0, 19, 30),
    scheduledEndAt: at(0, 22, 30),
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
    ...[1, 2, 3, 4].map((n) => ({
      id: `${tonight.id}-court-${n}`,
      sessionId: tonight.id,
      label: `Court ${n}`,
      startsAt: tonight.scheduledStartAt,
      openUntil: null,
      removedAt: null,
    })),
    ...history.courts,
  ]
  // Kenji, Kenjie and Atty Steph are not on any completed history roster (h1/h2), so the
  // roster fetch flags them First time here; slice(0, 14) are Returning.
  const registeredTonight = clubPlayers.filter(
    (p) => p.fullName === 'Kenji' || p.fullName === 'Kenjie' || p.nickname === 'Atty Steph',
  )
  if (registeredTonight.length !== 3)
    throw new Error('Missing Kenji, Kenjie or Atty Steph on the club roster.')
  const roster: SessionPlayer[] = [
    ...clubPlayers.slice(0, 14).map((p, i) => ({
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
    })),
    ...registeredTonight.map((p, i) => ({
      id: `s-tonight-player-${15 + i}`,
      sessionId: tonight.id,
      clubPlayerId: p.id,
      nameSnapshot: p.fullName,
      nicknameSnapshot: p.nickname,
      present: true,
      presentChangedAt: now,
      level: p.playingLevel,
      levelLockedAt: null,
      confirmedAt: now + i,
    })),
  ]
  // Player-side requests for the QM's Requests card (Q17.2, Q18.12): Jose's invite code, Derrick's
  // and Rhea's account requests through it, Paolo (new to the club) and Kiko (phone match), Klod
  // (confirmed, not present yet) saying they can't make it, and one open match request.
  const klod = roster[11]
  const klodPlayerId = clubPlayers.find((p) => p.id === klod?.clubPlayerId)?.playerId
  if (!klod || !klodPlayerId) throw new Error("Missing Klod on tonight's roster.")
  const sessionInviteCodes: SessionInviteCode[] = [
    {
      id: TONIGHT_INVITE_CODE_ID,
      sessionId: tonight.id,
      playerId: JOSE_PLAYER_ID,
      code: 'k7m2p9qw',
      createdAt: now - 2 * 3600000,
    },
  ]
  const dropOutNotices: DropOutNotice[] = [
    {
      id: 'drop-out-s-tonight-klod',
      sessionId: tonight.id,
      pid: klod.id,
      playerId: klodPlayerId,
      at: now - 12 * 60000,
      status: 'open',
      decision: null,
      closedAt: null,
    },
  ]
  // One open 2 v 2 match request for Requests › Match: a named partner, one named opponent and one
  // Anyone opponent, every named player present (the console stories' 2 v 2 shape). Add to queue
  // works once the session is started.
  const rosterId = (i: number) => {
    const row = roster[i]
    if (!row?.present) throw new Error("Missing a present player on tonight's roster.")
    return row.id
  }
  const matchRequests: MatchRequest[] = [
    {
      id: 'match-request-s-tonight-2v2',
      sessionId: tonight.id,
      pid: rosterId(3),
      format: 'doubles',
      partners: [rosterId(5)],
      opponents: [rosterId(7), null],
      at: now - 6 * 60000,
      status: 'open',
      decidedAt: null,
      matchId: null,
    },
  ]
  const requests = {
    joinRequests: [
      createAccountJoinRequestFixture(now),
      ...createSessionPageJoinRequestFixtures(now),
    ],
    dropOutNotices,
    matchRequests,
    sessionInviteCodes,
    /** Saved players (Rhea, Kiko) and profiles (Rhea, Paolo) only the sample requests need */
    clubPlayers: createRequestSeedClubPlayers(now),
    players: [RHEA_PLAYER, PAOLO_PLAYER],
    privatePhones: { [KIKO_CLUB_PLAYER_ID]: KIKO_PHONE_E164 } as Record<string, string>,
  }
  /** `roster` is tonight's only; the past sessions' rosters, matches and finalizations live under `history`. */
  return { sessions, courts, roster, history, requests }
}
export const queueSessionFixtures = createQueueFixtures()
export const liveSessionFixture = {
  ...queueSessionFixtures.sessions[0],
  state: 'active' as const,
  startedAt: Date.now(),
}
