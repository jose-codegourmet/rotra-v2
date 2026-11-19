import type { ProfileVisibility } from '../generated/prisma/client'

/**
 * The one masking rule of every public player read (B-54: leaderboard, profile, rank, games).
 * An `always_private` player is masked for every caller but themself; a `private` one only for a
 * caller who is not signed in (a signed-in ROTRA player still sees a private profile). `viewerId`
 * is the signed-in player, or null. A masked player is sent as the masked name only: no full name
 * or nickname, no playing level, no player ID that opens the profile, no game history; the picture
 * and banner stay (D-2026-11-12-01).
 */
export function isMasked(
  visibility: ProfileVisibility | string,
  viewerId: string | null,
  playerId: string,
) {
  if (viewerId !== null && viewerId === playerId) return false
  if (visibility === 'always_private') return true
  return visibility === 'private' && viewerId === null
}
