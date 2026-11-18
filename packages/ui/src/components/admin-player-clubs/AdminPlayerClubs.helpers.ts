import type { AdminPlayer } from '@rotra/data/admin-player/types'

/** One club that saved an unclaimed player, with that club's own name for them. */
export type SavedByClub = { club: string; name: string }

/** The line under the clubs when more than one club saved an unclaimed player. */
export const NOT_ON_LEADERBOARD_NOTE =
  'Saved by more than one club. Not on the leaderboard until they register.'

/**
 * The clubs that saved an unclaimed player, each with its own name for them; null unless more than
 * one club saved them and the data carries each club's name (rotra-admin.html savedBy()).
 */
export function savedByClubs(p: Pick<AdminPlayer, 'claimed' | 'clubs'>): SavedByClub[] | null {
  if (p.claimed || p.clubs.length < 2 || p.clubs.some((c) => !c.savedAs)) return null
  return p.clubs.map((c) => ({ club: c.name, name: c.savedAs ?? '' }))
}

/** "<First club> and 1 more club" ("and N more clubs" for more), rotra-admin.html clubLine(). */
export function moreClubsLine(clubs: readonly SavedByClub[]): string {
  const more = clubs.length - 1
  return `${clubs[0]?.club ?? ''} and ${more} more club${more === 1 ? '' : 's'}`
}
