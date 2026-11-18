import { isProductionBuild } from '../mock/env'

// @rotra/data ships without Node types; Next inlines NEXT_PUBLIC_* values at build time.
declare const process: { env: { NEXT_PUBLIC_ROTRA_MOCK_FLAGS?: string } }

/**
 * Dev-only, mock mode only: `NEXT_PUBLIC_ROTRA_MOCK_FLAGS=player_google_sign_in` (comma-separated
 * keys) forces those flags on, because Admin's mock store and the Player app's are separate
 * in-memory stores. Never applies to a production build; real mode ignores it (callers check).
 */
export function isMockFlagForcedOn(key: string): boolean {
  if (isProductionBuild()) return false
  return (process.env.NEXT_PUBLIC_ROTRA_MOCK_FLAGS ?? '')
    .split(',')
    .some((forced) => forced.trim() === key)
}
