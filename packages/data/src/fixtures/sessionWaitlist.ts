import type { SessionWaitlistEntry } from '../session-roster/sessionRoster.types'
import { clubPlayers } from './players'

/**
 * Story-only waitlist for the tonight fixture: the three saved players after the 14 on the roster,
 * in the order they joined. The normal store starts with an empty waitlist.
 */
export function createWaitlistFixtures(now = Date.now()): SessionWaitlistEntry[] {
  return clubPlayers.slice(14, 17).map((p, i) => ({
    id: `s-tonight-wait-${i + 1}`,
    sessionId: 's-tonight',
    clubPlayerId: p.id,
    level: p.playingLevel,
    addedAt: now - (3 - i) * 11 * 60000,
  }))
}

export const sessionWaitlistFixture = createWaitlistFixtures()
