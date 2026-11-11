import type { ClubPlayer } from '../club-player/clubPlayer.types'
import type { Player } from '../player/player.types'
import type { SessionJoinRequest } from '../session-roster/sessionRoster.types'
import { DEMO_CLUB_ID } from './clubs'
import { clubPlayers } from './players'

/** The session the sample guests asked to join (tonight's prepared session in queueSessions). */
export const JOIN_REQUEST_SESSION_ID = 's-tonight'

/**
 * The Queue prototype's four sample guests, oldest first: the same names, nicknames, phones and
 * stated bands the DevMenu "Add sample join request" action cycles through.
 */
export function createJoinRequestFixtures(now = Date.now()): SessionJoinRequest[] {
  const minutesAgo = (minutes: number) => now - minutes * 60_000
  return [
    {
      id: 'jr-rico',
      sessionId: JOIN_REQUEST_SESSION_ID,
      name: 'Tracy',
      nickname: 'Trace',
      phoneE164: '+639175550142',
      statedBand: 'intermediate',
      placement: 'slot',
      status: 'pending',
      requestedAt: minutesAgo(42),
      decidedAt: null,
      clubPlayerId: null,
    },
    {
      id: 'jr-mae',
      sessionId: JOIN_REQUEST_SESSION_ID,
      name: 'Gretchen',
      nickname: null,
      phoneE164: null,
      statedBand: 'beginner',
      placement: 'slot',
      status: 'pending',
      requestedAt: minutesAgo(31),
      decidedAt: null,
      clubPlayerId: null,
    },
    {
      id: 'jr-jp',
      sessionId: JOIN_REQUEST_SESSION_ID,
      name: 'PJ Perez',
      nickname: 'PJ',
      phoneE164: '+639285550199',
      statedBand: 'advanced',
      placement: 'slot',
      status: 'pending',
      requestedAt: minutesAgo(17),
      decidedAt: null,
      clubPlayerId: null,
    },
    {
      id: 'jr-tessa',
      sessionId: JOIN_REQUEST_SESSION_ID,
      name: 'Jess',
      nickname: null,
      phoneE164: '+639055550110',
      statedBand: 'unsure',
      placement: 'slot',
      status: 'pending',
      requestedAt: minutesAgo(6),
      decidedAt: null,
      clubPlayerId: null,
    },
  ]
}

/**
 * The same four guests after the Queue Master decided them: Tracy and PJ confirmed, Gretchen declined,
 * Jess still waiting. For the "No requests waiting. N confirmed, M declined so far." state use
 * only the decided ones.
 */
export function createDecidedJoinRequestFixtures(now = Date.now()): SessionJoinRequest[] {
  const [rico, mae, jp, tessa] = createJoinRequestFixtures(now)
  if (!rico || !mae || !jp || !tessa) throw new Error('Missing join request fixtures.')
  const decide = (
    r: SessionJoinRequest,
    status: 'confirmed' | 'declined',
    clubPlayerId: string | null,
  ): SessionJoinRequest => ({ ...r, status, decidedAt: r.requestedAt + 4 * 60_000, clubPlayerId })
  return [
    decide(rico, 'confirmed', 'cp-jr-rico'),
    decide(mae, 'declined', null),
    decide(jp, 'confirmed', 'cp-jr-jp'),
    tessa,
  ]
}

/** The invite code Jose shares for tonight (the prototype's `k7m2p9qw` on p1). */
export const TONIGHT_INVITE_CODE_ID = 'invite-s-tonight-jose'

/**
 * D-2026-11-09-02/08: one pending **Request to join as NAME** from a signed-in ROTRA player who is
 * already in the club (Derrick, not on tonight's roster), invited through Jose's Session invite.
 * Seeded in the mock store so the QM's Requests › Join shows the account variant.
 */
export function createAccountJoinRequestFixture(now = Date.now()): SessionJoinRequest {
  const derrick = clubPlayers.find((p) => p.fullName === 'Derrick')
  if (!derrick?.playerId) throw new Error('Missing Derrick on the club roster.')
  return {
    id: 'jr-account-derrick',
    sessionId: JOIN_REQUEST_SESSION_ID,
    name: derrick.fullName,
    nickname: derrick.nickname,
    phoneE164: null,
    statedBand: 'intermediate',
    status: 'pending',
    requestedAt: now - 25 * 60_000,
    decidedAt: null,
    clubPlayerId: null,
    playerId: derrick.playerId,
    inviteCodeId: TONIGHT_INVITE_CODE_ID,
    placement: 'slot',
  }
}

/**
 * The prototype's Rhea Villanueva (p21, same RTR ID): a registered ROTRA player saved in the club.
 * Not in the shared player pool, so only the mock store's request seeds add her.
 */
export const RHEA_PLAYER: Player = {
  id: 'player-rhea-villanueva',
  fullName: 'Rhea Villanueva',
  nickname: null,
  rtrId: 'RTR-PH-CEB-101426-0064',
}

/**
 * The prototype's Paolo Reyes (directory g1): a registered ROTRA player new to the club. His
 * prototype RTR ID belongs to Camill in the shared pool, so this mock profile carries a fresh one.
 */
export const PAOLO_PLAYER: Player = {
  id: 'player-paolo-reyes',
  fullName: 'Paolo Reyes',
  nickname: null,
  rtrId: 'RTR-PH-MNL-020326-0201',
}

/** The prototype's Kiko Salazar (p19): a saved guest whose private phone is 0917 555 0188. */
export const KIKO_CLUB_PLAYER_ID = 'club-player-kiko-salazar'
export const KIKO_PHONE_E164 = '+639175550188'

/**
 * Saved players the prototype's sample requests need (D-2026-11-09-02/06): Rhea, already in the
 * club, and Kiko, the guest the phone match suggests. Kept out of `clubPlayers` (the shared pool's
 * 23 registered players); the mock store appends them.
 */
export function createRequestSeedClubPlayers(now = Date.now()): ClubPlayer[] {
  return [
    {
      id: 'club-player-rhea-villanueva',
      clubId: DEMO_CLUB_ID,
      playerId: RHEA_PLAYER.id,
      fullName: RHEA_PLAYER.fullName,
      nickname: null,
      identity: 'registered',
      playingLevel: 'intermediate_mid',
      addedAt: now - 51 * 86_400_000,
      joinedVia: 'added',
    },
    {
      id: KIKO_CLUB_PLAYER_ID,
      clubId: DEMO_CLUB_ID,
      playerId: null,
      fullName: 'Kiko Salazar',
      nickname: null,
      identity: 'guest',
      playingLevel: null,
      addedAt: now,
      joinedVia: 'added',
    },
  ]
}

/**
 * The prototype's sample requests on Sunday Night Queue (D-2026-11-09-02/06/08), oldest first:
 * Rhea (in the club, invited by Migs; Jose's invite stands in), Paolo Reyes (a ROTRA player new to
 * the club), and Kiko Salazar (a guest whose
 * phone matches the saved guest Kiko).
 */
export function createSessionPageJoinRequestFixtures(now = Date.now()): SessionJoinRequest[] {
  const base = {
    sessionId: JOIN_REQUEST_SESSION_ID,
    phoneE164: null,
    status: 'pending' as const,
    decidedAt: null,
    clubPlayerId: null,
  }
  return [
    {
      ...base,
      id: 'q-seed-rhea',
      name: RHEA_PLAYER.fullName,
      nickname: null,
      statedBand: 'intermediate',
      placement: 'slot',
      requestedAt: now - 25 * 60_000,
      playerId: RHEA_PLAYER.id,
      inviteCodeId: TONIGHT_INVITE_CODE_ID,
    },
    {
      ...base,
      id: 'q-seed-paolo',
      name: PAOLO_PLAYER.fullName,
      nickname: null,
      statedBand: 'beginner',
      placement: 'slot',
      requestedAt: now - 18 * 60_000,
      playerId: PAOLO_PLAYER.id,
    },
    {
      ...base,
      id: 'q-seed-kiko',
      name: 'Kiko Salazar',
      nickname: null,
      phoneE164: KIKO_PHONE_E164,
      statedBand: 'intermediate',
      placement: 'slot',
      requestedAt: now - 9 * 60_000,
    },
  ]
}

/** Pending sample requests, oldest first. */
export const joinRequests = createJoinRequestFixtures()

/** Tracy and PJ confirmed, Gretchen declined, Jess pending. */
export const decidedJoinRequests = createDecidedJoinRequestFixtures()
