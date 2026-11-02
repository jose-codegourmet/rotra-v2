import type { LeaderboardEntry } from '../leaderboard/leaderboard.types'
import { realRequest } from './client'

/** A listed player with their overall position (public fields only). */
export type RealLeaderboardEntry = LeaderboardEntry & { position: number }

/**
 * P-LEADERBOARD over the Player app's `/api/leaderboard` Route Handlers. The server lists only
 * stored, approved ranks; with no formula approved (#247) every read is the empty state.
 */
export function realGetLeaderboardPage(
  { offset, limit }: { offset: number; limit: number },
  signal?: AbortSignal,
) {
  return realRequest<{ entries: RealLeaderboardEntry[]; total: number }>(
    `/api/leaderboard?offset=${offset}&limit=${limit}`,
    { signal },
  )
}

export function realSearchLeaderboard(query: string, signal?: AbortSignal) {
  return realRequest<{ hits: RealLeaderboardEntry[]; total: number }>(
    `/api/leaderboard/search?q=${encodeURIComponent(query.trim())}`,
    { signal },
  )
}

/** The signed-in player's own position, or null when they are not listed. */
export async function realGetMyLeaderboardPosition(signal?: AbortSignal) {
  const { position } = await realRequest<{ position: number | null }>('/api/leaderboard/me', {
    signal,
  })
  return position
}
