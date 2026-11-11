import type { MyClub } from '../player-club/fetchers'
import { realRequest } from './client'

// ---------- Your clubs (P-OWN-PROFILE), Join club and Leave club ----------

export async function realGetMyClubs(signal?: AbortSignal) {
  const { clubs } = await realRequest<{ clubs: MyClub[] }>('/api/me/clubs', { signal })
  return clubs
}
export function realJoinClub(clubId: string) {
  return realRequest<{ playerId: string; clubId: string }>('/api/me/clubs', {
    method: 'POST',
    body: { clubId },
  })
}
/** Marks the player's club row removed; the server keeps it for history. */
export function realLeaveClub(clubId: string) {
  return realRequest<{ playerId: string; clubId: string }>(
    `/api/me/clubs/${encodeURIComponent(clubId)}`,
    { method: 'DELETE' },
  )
}
