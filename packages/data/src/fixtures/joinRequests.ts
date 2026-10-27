import type { SessionJoinRequest } from '../session-roster/sessionRoster.types'

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
      name: 'Rico Santos',
      nickname: 'Rics',
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
      name: 'Mae Lagman',
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
      name: 'JP Uy',
      nickname: 'JP',
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
      name: 'Tessa Ramos',
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
 * The same four guests after the Queue Master decided them: Rico and JP confirmed, Mae declined,
 * Tessa still waiting. For the "No requests waiting. N confirmed, M declined so far." state use
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
  return [decide(rico, 'confirmed', 'cp-jr-rico'), decide(mae, 'declined', null), decide(jp, 'confirmed', 'cp-jr-jp'), tessa]
}

/** Pending sample requests, oldest first. */
export const joinRequests = createJoinRequestFixtures()

/** Rico and JP confirmed, Mae declined, Tessa pending. */
export const decidedJoinRequests = createDecidedJoinRequestFixtures()
