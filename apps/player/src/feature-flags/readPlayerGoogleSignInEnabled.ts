import { PLAYER_GOOGLE_SIGN_IN_FLAG } from '@rotra/data/feature-flag/keys'
import { isMockFlagForcedOn } from '@rotra/data/feature-flag/mock-override'
import { dataMode } from '@rotra/db/auth/data-mode'
import { readPlayerFeatureFlag } from '@rotra/db/player/feature-flags'
import { connection } from 'next/server'

/**
 * Is `player_google_sign_in` on? Server-side, usable signed out, known before the page renders
 * (D-2026-11-18-01). Real mode reads the database on every request (never cached, so the page is
 * dynamic); a missing flag or failed read is off. Mock mode: off unless
 * `NEXT_PUBLIC_ROTRA_MOCK_FLAGS` forces it on (dev only); the client hook also follows the mock store.
 */
export async function readPlayerGoogleSignInEnabled(): Promise<boolean> {
  if (dataMode() === 'real') {
    await connection()
    return readPlayerFeatureFlag(PLAYER_GOOGLE_SIGN_IN_FLAG)
  }
  return isMockFlagForcedOn(PLAYER_GOOGLE_SIGN_IN_FLAG)
}
