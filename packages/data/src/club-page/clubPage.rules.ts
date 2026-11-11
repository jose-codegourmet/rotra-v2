import type { PlayingLevel } from '../player/player.types'
import { maskPublicName } from '../public-session/publicSession.rules'
import type { ClubPageMember, ClubPageSession, ClubPageSessionStatus } from './clubPage.types'

/** Members shown at a time on the club page grid (Show more adds as many again). */
export const CLUB_MEMBERS_PAGE = 12
/** Done sessions keep their session page for three months (D-2026-11-11-09). */
export const SESSION_PAGE_RETENTION_DAYS = 90
const DAY = 864e5

export type ClubMemberBand = 'all' | 'beginner' | 'intermediate' | 'advanced' | 'none'

/**
 * Visibility flags read for a member. `alwaysPrivate` and `hiddenFromDirectory` do not exist in the
 * mock store or the database yet (#715); they are read as optional fields with a false default so the
 * rule is ready when they land. `profilePrivate` is the existing visibility field.
 */
export type MemberVisibility = {
  profilePrivate?: boolean
  alwaysPrivate?: boolean
  hiddenFromDirectory?: boolean
}

/**
 * D-2026-11-11-11: a visitor sees every name masked (like the public session page); a signed-in
 * player sees names; an always-private member stays masked for everyone but themself.
 */
export function isMemberMasked(
  visibility: MemberVisibility,
  viewer: { signedIn: boolean; isSelf: boolean },
) {
  if (viewer.isSelf) return false
  if (!viewer.signedIn) return true
  return !!visibility.alwaysPrivate
}

/** Projects one registered member for the viewer; masked rows lose their player id and nickname. */
export function projectMember(
  row: {
    key: string
    playerId: string
    name: string
    nickname: string | null
    picture: string | null
    level: PlayingLevel | null
  },
  visibility: MemberVisibility,
  viewerId: string | null,
): ClubPageMember {
  const isSelf = viewerId === row.playerId
  const masked = isMemberMasked(visibility, { signedIn: !!viewerId, isSelf })
  return masked
    ? {
        key: row.key,
        playerId: null,
        name: maskPublicName(row.name),
        nickname: null,
        picture: row.picture,
        level: row.level,
        isYou: false,
        masked: true,
      }
    : { ...row, isYou: isSelf, masked: false }
}

export const byShownName = (a: ClubPageMember, b: ClubPageMember) => a.name.localeCompare(b.name)

/** The level band for the Members page Level segment. */
export function bandOf(level: PlayingLevel | null): Exclude<ClubMemberBand, 'all'> {
  if (!level) return 'none'
  return level.split('_')[0] as Exclude<ClubMemberBand, 'all' | 'none'>
}

/** P-CLUB-MEMBERS: name or nickname (masked members never match a search) and level band. */
export function filterClubMembers(members: ClubPageMember[], query: string, band: ClubMemberBand) {
  const q = query.trim().toLowerCase()
  return members.filter(
    (m) =>
      (!q ||
        (!m.masked &&
          (m.name.toLowerCase().includes(q) || (m.nickname ?? '').toLowerCase().includes(q)))) &&
      (band === 'all' || bandOf(m.level) === band),
  )
}

/** Session state → page status; cancelled and invalid sessions are left out (null). */
export function clubSessionStatus(state: string): ClubPageSessionStatus | null {
  if (state === 'active') return 'live'
  if (state === 'prepared') return 'scheduled'
  if (state === 'finalizing' || state === 'completed') return 'done'
  return null
}

/** A done session's page is kept for three months after it ends. */
export function sessionPageKept(endsAt: number, now = Date.now()) {
  return endsAt >= now - SESSION_PAGE_RETENTION_DAYS * DAY
}

/** Upcoming (live first, then scheduled, soonest first). */
export function upcomingSessions(sessions: ClubPageSession[]) {
  return sessions
    .filter((s) => s.status !== 'done')
    .sort(
      (a, b) =>
        Number(b.status === 'live') - Number(a.status === 'live') || a.startsAt - b.startsAt,
    )
}

const monthIndex = (at: number) => new Date(at).getFullYear() * 12 + new Date(at).getMonth()

/**
 * The calendar's month range: back to the oldest session's month, forward to the last upcoming
 * session's month, always including this month.
 */
export function calendarMonthRange(sessions: ClubPageSession[], now = Date.now()) {
  const current = monthIndex(now)
  const months = sessions.map((s) => monthIndex(s.startsAt))
  const ahead = sessions.filter((s) => s.status !== 'done').map((s) => monthIndex(s.startsAt))
  return { min: Math.min(current, ...months), max: Math.max(current, ...ahead), current }
}

export { monthIndex }

/** Sessions this month, and how many are done. */
export function sessionsThisMonth(sessions: ClubPageSession[], now = Date.now()) {
  const inMonth = sessions.filter((s) => monthIndex(s.startsAt) === monthIndex(now))
  return { count: inMonth.length, done: inMonth.filter((s) => s.status === 'done').length }
}

/** The club's current invite link inside the Player app (the page and the link are separate). */
export function clubJoinHref(clubId: string, inviteCode?: string | null) {
  const base = `/register/${encodeURIComponent(clubId)}`
  return inviteCode ? `${base}?k=${encodeURIComponent(inviteCode)}` : base
}
