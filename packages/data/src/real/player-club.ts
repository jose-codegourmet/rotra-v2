import type { PlayerClub } from '../player-club/fetchers'
import { realRequest } from './client'

// ---------- Clubs card (P-PROFILE, #766), Join club and Leave club ----------

/** The signed-in player's own clubs, with how they joined. Private. */
export async function realGetMyClubs(signal?: AbortSignal) {
  const { clubs } = await realRequest<{ clubs: PlayerClub[] }>('/api/me/clubs', { signal })
  return clubs
}
/** Another player's clubs (public read): id, name, initials and logo only, never how they joined. */
export async function realGetPlayerClubs(playerId: string, signal?: AbortSignal) {
  const { clubs } = await realRequest<{ clubs: PlayerClub[] }>(
    `/api/players/${encodeURIComponent(playerId)}/clubs`,
    { signal },
  )
  return clubs
}
/** Join club through a club invite link; the server checks `inviteCode` (the link's `k`, #712). */
export function realJoinClub(clubId: string, inviteCode?: string | null) {
  return realRequest<{ playerId: string; clubId: string }>('/api/me/clubs', {
    method: 'POST',
    body: { clubId, inviteCode: inviteCode ?? '' },
  })
}
/** Marks the player's club row removed; the server keeps it for history. */
export function realLeaveClub(clubId: string) {
  return realRequest<{ playerId: string; clubId: string }>(
    `/api/me/clubs/${encodeURIComponent(clubId)}`,
    { method: 'DELETE' },
  )
}
