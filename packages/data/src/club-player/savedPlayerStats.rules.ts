import type { ClubPlayer, SavedPlayerStats } from './clubPlayer.types'

const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000

/** Monday 00:00 Asia/Manila as an instant, independent of the runtime's timezone. */
export function savedPlayerWeekStart(now: number): number {
  // Asia/Manila is UTC+08:00 with no daylight-saving changes in the supported modern dates.
  const local = new Date(now + MANILA_OFFSET_MS)
  const daysSinceMonday = (local.getUTCDay() + 6) % 7
  return (
    Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() - daysSinceMonday) -
    MANILA_OFFSET_MS
  )
}

/** Count saved records, not names or session appearances. Filters never enter this calculation. */
export function deriveSavedPlayerStats(
  players: readonly ClubPlayer[],
  clubId: string,
  now: number,
): SavedPlayerStats {
  const weekStart = savedPlayerWeekStart(now)
  const stats: SavedPlayerStats = {
    totalPlayers: 0,
    totalRegistered: 0,
    totalBeginners: 0,
    totalIntermediates: 0,
    totalAdvanced: 0,
    newPlayersThisWeek: 0,
  }
  for (const player of players) {
    if (player.clubId !== clubId) continue
    stats.totalPlayers++
    if (player.identity === 'registered') stats.totalRegistered++
    if (player.playingLevel?.startsWith('beginner_')) stats.totalBeginners++
    if (player.playingLevel?.startsWith('intermediate_')) stats.totalIntermediates++
    if (player.playingLevel?.startsWith('advanced_')) stats.totalAdvanced++
    if (
      player.addedAt !== undefined &&
      Number.isFinite(player.addedAt) &&
      player.addedAt >= weekStart &&
      player.addedAt <= now
    ) {
      stats.newPlayersThisWeek++
    }
  }
  return stats
}
