import type { ClubTrustedHost } from '../trusted-host/trustedHost.types'
import { DEMO_CLUB_ID } from './clubs'
import { GAB_CLUB_PLAYER_ID } from './players'

/** Jose's saved-player record in the demo club (the prototype's Miguel Santos, registered). */
const JOSE_CLUB_PLAYER_ID = 'c3e0d1c0-f087-5514-8c94-7ce61c54ed3f'

/**
 * The demo club's trusted-host list (D-2026-11-22-01), as the Queue prototype seeds it: Jose
 * (registered, the prototype's Miguel) and Gab Torres (unclaimed: saved with an email, no ROTRA
 * account). A third, removed row (Aaron) shows that removal keeps the row as history.
 */
export function createTrustedHostFixtures(now: number): ClubTrustedHost[] {
  const day = 86_400_000
  return [
    {
      id: '0f1e2d3c-4b5a-4968-8776-a1b2c3d4e5f1',
      clubId: DEMO_CLUB_ID,
      clubPlayerId: JOSE_CLUB_PLAYER_ID,
      addedAt: now - 40 * day,
      removedAt: null,
    },
    {
      id: '0f1e2d3c-4b5a-4968-8776-a1b2c3d4e5f2',
      clubId: DEMO_CLUB_ID,
      clubPlayerId: GAB_CLUB_PLAYER_ID,
      addedAt: now - 6 * day,
      removedAt: null,
    },
    {
      id: '0f1e2d3c-4b5a-4968-8776-a1b2c3d4e5f3',
      clubId: DEMO_CLUB_ID,
      // Aaron: trusted for a while, then removed two days ago; still a saved player. Sunday Night
      // Queue (h2, a week ago) still shows him as its host (#1008, fixtures/sessionHosts.ts).
      clubPlayerId: '62dc8cc2-6673-5356-b659-51e1fa5d533c',
      addedAt: now - 60 * day,
      removedAt: now - 2 * day,
    },
  ]
}
