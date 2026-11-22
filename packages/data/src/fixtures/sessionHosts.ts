import type { SessionHostRecord } from '../session-host/sessionHost.types'
import { DEMO_CLUB_ID } from './clubs'
import { GAB_CLUB_PLAYER_ID } from './players'

/** Jose's saved-player record in the demo club (the prototype's Miguel Santos, registered). */
const JOSE_CLUB_PLAYER_ID = 'c3e0d1c0-f087-5514-8c94-7ce61c54ed3f'
/** Aaron's saved-player record: a trusted host until two days ago (fixtures/trustedHosts.ts). */
const AARON_CLUB_PLAYER_ID = '62dc8cc2-6673-5356-b659-51e1fa5d533c'

/**
 * The demo club's session hosts (D-2026-11-22-01), as the Queue prototype seeds them.
 *
 * Tonight (#1006): Jose plays (he is on the roster, so he shows in Hosts and Players and takes one
 * slot), Gab Torres does not play (no roster entry), so the public page shows him in Hosts only.
 *
 * Sunday Night Queue, `h2` (#1008), finished a week ago: Aaron hosted it and was frozen with the
 * session, so it still shows him although he is no longer a trusted host. Gab Torres was a host
 * too until an hour into the night; that row ended before the finish, so it is history only and
 * not a host of the finished session.
 */
export function createSessionHostFixtures(now: number): SessionHostRecord[] {
  const night = new Date(now)
  night.setDate(night.getDate() - 7)
  night.setHours(18, 0, 0, 0)
  const start = night.getTime()
  // simulateHistory(): a three-hour night, finished ten minutes after its end.
  const finishedAt = start + 3 * 3_600_000 + 10 * 60_000
  return [
    {
      id: '1a2b3c4d-5e6f-4a8b-9c0d-e1f2a3b4c5d1',
      clubId: DEMO_CLUB_ID,
      sessionId: 's-tonight',
      clubPlayerId: JOSE_CLUB_PLAYER_ID,
      assignedAt: now - 3_600_000,
      removedAt: null,
      nameSnapshot: 'Jose',
      frozenAt: null,
    },
    {
      id: '1a2b3c4d-5e6f-4a8b-9c0d-e1f2a3b4c5d2',
      clubId: DEMO_CLUB_ID,
      sessionId: 's-tonight',
      clubPlayerId: GAB_CLUB_PLAYER_ID,
      assignedAt: now - 3_600_000 + 1,
      removedAt: null,
      nameSnapshot: 'Gab Torres',
      frozenAt: null,
    },
    {
      id: '1a2b3c4d-5e6f-4a8b-9c0d-e1f2a3b4c5d3',
      clubId: DEMO_CLUB_ID,
      sessionId: 'h2',
      clubPlayerId: AARON_CLUB_PLAYER_ID,
      assignedAt: start - 3_600_000,
      removedAt: null,
      nameSnapshot: 'Aaron',
      frozenAt: finishedAt,
    },
    {
      id: '1a2b3c4d-5e6f-4a8b-9c0d-e1f2a3b4c5d4',
      clubId: DEMO_CLUB_ID,
      sessionId: 'h2',
      clubPlayerId: GAB_CLUB_PLAYER_ID,
      assignedAt: start - 3_600_000 + 1,
      removedAt: start + 3_600_000,
      nameSnapshot: 'Gab Torres',
      frozenAt: null,
    },
  ]
}
