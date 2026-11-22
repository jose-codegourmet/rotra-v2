import type { SessionHostRecord } from '../session-host/sessionHost.types'
import { DEMO_CLUB_ID } from './clubs'
import { GAB_CLUB_PLAYER_ID } from './players'

/** Jose's saved-player record in the demo club (the prototype's Miguel Santos, registered). */
const JOSE_CLUB_PLAYER_ID = 'c3e0d1c0-f087-5514-8c94-7ce61c54ed3f'

/**
 * Tonight's hosts (#1006, D-2026-11-22-01), as the Queue prototype seeds them: Jose plays (he is on
 * the roster, so he shows in Hosts and Players and takes one slot), Gab Torres does not play (no
 * roster entry), so the public page shows him in Hosts only.
 */
export function createSessionHostFixtures(now: number): SessionHostRecord[] {
  return [
    {
      id: '1a2b3c4d-5e6f-4a8b-9c0d-e1f2a3b4c5d1',
      clubId: DEMO_CLUB_ID,
      sessionId: 's-tonight',
      clubPlayerId: JOSE_CLUB_PLAYER_ID,
      assignedAt: now - 3_600_000,
      removedAt: null,
    },
    {
      id: '1a2b3c4d-5e6f-4a8b-9c0d-e1f2a3b4c5d2',
      clubId: DEMO_CLUB_ID,
      sessionId: 's-tonight',
      clubPlayerId: GAB_CLUB_PLAYER_ID,
      assignedAt: now - 3_600_000 + 1,
      removedAt: null,
    },
  ]
}
