import type { SelfCheckInMark } from '../match-request/matchRequest.types'
import type { MockState } from '../mock/store'
import { PLAYING_LEVELS, type PlayingLevel } from '../player/player.types'
import type { QueueSession } from '../queue-session/queueSession.types'
import type { SessionPlayer } from '../session-roster/sessionRoster.types'
import type { PublicSessionParticipant, PublicSkillMix } from './publicSession.types'

/**
 * Public participant names (owner decision, November 7, 2026; #475): each whitespace-separated word
 * becomes its first character plus a fixed "***", so "Jose Adrian" → "J*** A***" and "Mika" →
 * "M***". The fixed suffix never reveals a word's length. An empty or whitespace-only name reads
 * "Player". The first character is the first code point, so an emoji or accented letter stays whole.
 * Applied on the server (or the mock server) before a name enters `PublicSessionPage`.
 */
export function maskPublicName(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (!words.length) return 'Player'
  return words.map((w) => `${Array.from(w)[0]}***`).join(' ')
}

/** Project a recognized playing level into the public ring and hover label. */
export function publicLevel(
  level: PlayingLevel | null | undefined,
): Pick<PublicSessionParticipant, 'skillGroup' | 'levelLabel'> {
  if (!level || !PLAYING_LEVELS.includes(level)) return { skillGroup: null, levelLabel: null }
  const [group, tier] = level.split('_')
  if (!group || !tier) return { skillGroup: null, levelLabel: null }
  const capitalize = (word: string) => word.charAt(0).toUpperCase() + word.slice(1)
  return {
    skillGroup: group as NonNullable<PublicSessionParticipant['skillGroup']>,
    levelLabel: `${capitalize(group)} ${capitalize(tier)}`,
  }
}

/**
 * #474: aggregate skill mix for the public page, computed on the server (or the mock server) over
 * the same entries as the public participant list. Same level → group rule as the organizer
 * roster's Skill group (`rosterLevelFamily`): `advanced_low|mid|high` → advanced, and so on; a
 * missing or unknown level → unrated.
 */
export function publicSkillMix(
  levels: (PlayingLevel | string | null | undefined)[],
): PublicSkillMix {
  const mix: PublicSkillMix = { beginner: 0, intermediate: 0, advanced: 0, unrated: 0 }
  for (const level of levels) {
    const band = level ? level.split('_')[0] : null
    if (band === 'beginner' || band === 'intermediate' || band === 'advanced') mix[band] += 1
    else mix.unrated += 1
  }
  return mix
}

/**
 * Self check-in mark (D-2026-11-09-03), the QM's last action wins: “Checked in themselves” only while
 * present and no presence change came after the player's own I'm here; “Left” only while not
 * present and nothing came after their I'm leaving. Any QM presence change after it clears it
 * (the Present switch, a batch, Mark all) because it moves `presentChangedAt` past the mark.
 */
export function selfCheckInMark(
  row: Pick<SessionPlayer, 'present' | 'presentChangedAt' | 'selfCheckedInAt' | 'leftAt'>,
): SelfCheckInMark | null {
  const changed = row.presentChangedAt ?? 0
  if (row.present && row.selfCheckedInAt != null && changed <= row.selfCheckedInAt)
    return { kind: 'checked-in', at: row.selfCheckedInAt }
  if (!row.present && row.leftAt != null && changed <= row.leftAt)
    return { kind: 'left', at: row.leftAt }
  return null
}

/** Finished, invalid and cancelled sessions take no requests; their open ones read as closed. */
export const sessionTakesRequests = (session: Pick<QueueSession, 'state'>) =>
  session.state === 'prepared' || session.state === 'active' || session.state === 'finalizing'

/**
 * Finishing or cancelling a session closes every pending join request, open drop-out notice and
 * open match request (status `closed`, kept on the record, hidden). Mutates the draft.
 */
export function closeSessionRequests(state: MockState, sessionId: string, now = Date.now()) {
  for (const r of state.joinRequests)
    if (r.sessionId === sessionId && r.status === 'pending') {
      r.status = 'closed'
      r.decidedAt = now
    }
  for (const d of state.dropOutNotices)
    if (d.sessionId === sessionId && d.status === 'open') {
      d.status = 'closed'
      d.closedAt = now
    }
  for (const m of state.matchRequests)
    if (m.sessionId === sessionId && m.status === 'open') {
      m.status = 'closed'
      m.decidedAt = now
    }
}

/** The club player records of the club linked to this Player account. */
export function linkedClubPlayerIds(state: MockState, clubId: string, playerId: string) {
  return new Set(
    state.clubPlayers
      .filter((p) => p.clubId === clubId && p.playerId === playerId && !p.removedAt)
      .map((p) => p.id),
  )
}

/** The signed-in Player's roster row and waitlist entry in this session, if any. */
export function playerSlot(
  state: MockState,
  session: Pick<QueueSession, 'id' | 'clubId'>,
  playerId: string,
) {
  const linked = linkedClubPlayerIds(state, session.clubId, playerId)
  return {
    roster:
      state.roster.find((r) => r.sessionId === session.id && linked.has(r.clubPlayerId)) ?? null,
    waitlist:
      state.waitlist.find((w) => w.sessionId === session.id && linked.has(w.clubPlayerId)) ?? null,
  }
}

/** The prototype's invite code alphabet: no 0/1/i/l/o, so a code reads cleanly aloud. */
const INVITE_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'
export const INVITE_CODE_LENGTH = 8

/** A random 8-character Session invite code, never the RTR ID. */
export function makeInviteCode(taken: ReadonlySet<string> = new Set()): string {
  for (;;) {
    const bytes = crypto.getRandomValues(new Uint8Array(INVITE_CODE_LENGTH))
    const code = Array.from(bytes, (b) => INVITE_ALPHABET[b % INVITE_ALPHABET.length]).join('')
    if (!taken.has(code)) return code
  }
}

/** First word of a displayed name: “Jose Adrian” → “Jose”, a masked “Y*** Z***” → “Y***”. */
export function publicFirstName(name: string): string {
  return name.trim().split(/\s+/).filter(Boolean)[0] ?? 'Player'
}

/** “with A vs B, C”; “vs B, C” when the viewer plays alone; “with A” with no opponent named yet. */
export function myMatchLabel(partners: string[], opponents: string[]): string {
  const withPart = partners.length ? `with ${partners.join(', ')}` : ''
  const vsPart = opponents.length ? `vs ${opponents.join(', ')}` : ''
  return [withPart, vsPart].filter(Boolean).join(' ')
}

/** Refresh on the session page is disabled for 10 s after a tap (D-2026-11-09-04). */
export const REFRESH_THROTTLE_MS = 10_000

/** When Refresh works again after a refresh at `lastRefreshedAt`; null when it never ran. */
export function refreshAvailableAt(lastRefreshedAt: number | null): number | null {
  return lastRefreshedAt === null ? null : lastRefreshedAt + REFRESH_THROTTLE_MS
}

/** True when Refresh may run at `now` (never refreshed, or 10 s have passed). */
export function canRefreshNow(lastRefreshedAt: number | null, now = Date.now()): boolean {
  const next = refreshAvailableAt(lastRefreshedAt)
  return next === null || now >= next
}
