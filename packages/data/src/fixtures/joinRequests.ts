import type { SessionJoinRequest } from '../session-roster/sessionRoster.types'
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
  }
}

/** Pending sample requests, oldest first. */
export const joinRequests = createJoinRequestFixtures()

/** Tracy and PJ confirmed, Gretchen declined, Jess pending. */
export const decidedJoinRequests = createDecidedJoinRequestFixtures()
