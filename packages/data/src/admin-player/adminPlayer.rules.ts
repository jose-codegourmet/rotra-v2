import { plainIdentity } from '../club/club.rules'
import { PLAYING_LEVELS } from '../player/player.types'
import { levelLabel } from '../session-roster/sessionRoster.rules'
import type { AdminPlayerAccountFilter, RankStatus, SameNameGroup } from './adminPlayer.types'

/** Rows per page; the Players screen asks for this many more each time. */
export const ADMIN_PLAYER_PAGE_SIZE = 25

/**
 * rotra-admin.html rankOf(). `threshold` is the recent-match requirement in effect (Player
 * Information ranking settings, initially 10) until A04.4 switches it to the effective settings version.
 */
export function rankStatusOf(
  levelIndex: number | null,
  recentStandardMatches: number,
  threshold: number,
): RankStatus {
  const level = levelIndex === null ? undefined : PLAYING_LEVELS[levelIndex]
  if (!level) return { kind: 'none', text: 'No rank yet' }
  if (recentStandardMatches < threshold) {
    return {
      kind: 'below',
      text: `${levelLabel(level)} · ${recentStandardMatches} of ${threshold} recent matches`,
    }
  }
  return { kind: 'board', text: `${levelLabel(level)} · on the overall leaderboard` }
}

/**
 * rotra-admin.html playerMatches(): name, nickname, RTR ID and email match accent- and case-insensitive;
 * phone digits match only when the query has 4 or more digits, and a leading 0 also matches as 63.
 * Admin only: public search must never match phones or emails.
 */
export function matchesAdminPlayerSearch(
  player: { name: string; nickname: string | null; rtrId: string; email?: string; phone?: string },
  q: string | undefined,
): boolean {
  const query = (q ?? '').trim()
  if (!query) return true
  const text = plainIdentity(
    [player.name, player.nickname ?? '', player.rtrId, player.email ?? ''].join(' '),
  )
  if (text.includes(plainIdentity(query))) return true
  const digits = query.replace(/\D/g, '')
  if (digits.length < 4) return false
  const phone = (player.phone ?? '').replace(/\D/g, '')
  return phone.includes(digits) || phone.includes(digits.replace(/^0/, '63'))
}

export function matchesAccountFilter(
  claimed: boolean,
  account: AdminPlayerAccountFilter = 'all',
): boolean {
  return account === 'all' || (account === 'registered' ? claimed : !claimed)
}

/** Names that more than one identity shares, in first-seen order (exact name match, never merged). */
export function sameNameGroups(rows: readonly { name: string }[]): SameNameGroup[] {
  const counts = new Map<string, number>()
  for (const row of rows) counts.set(row.name, (counts.get(row.name) ?? 0) + 1)
  return [...counts].filter(([, count]) => count > 1).map(([name, count]) => ({ name, count }))
}

/** 'RTR-PH-CEB-031526-0001' → '2026-03-15' (the date segment is MMDDYY); '' when malformed. */
export function createdOnFromRtrId(rtrId: string): string {
  const segment = rtrId.split('-')[3] ?? ''
  if (!/^\d{6}$/.test(segment)) return ''
  return `20${segment.slice(4, 6)}-${segment.slice(0, 2)}-${segment.slice(2, 4)}`
}
