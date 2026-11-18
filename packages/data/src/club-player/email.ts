import { emailField } from '@rotra/schema/email'
import { getConnectivity } from '../connectivity/connectivity'
import { MockError } from '../mock/errors'
import type { MockState } from '../mock/store'
import {
  accountByEmail,
  createUnclaimedPerson,
  emailKey,
  isCurrentRecord,
  savedRecordByEmail,
  syncUnclaimedProjection,
} from '../player/unclaimed'
import type { ClubPlayer } from './clubPlayer.types'

/**
 * What an email does to a club's own record (D-2026-11-16-04, rotra-queue.html applyEmail()): no
 * email keeps a guest; an email makes the record an unclaimed player with a new RTR ID, links it
 * to the ROTRA player who already has that email (registered, or another club's unclaimed player
 * with the same RTR ID), or waits for the next sync when the device is offline (Lookup pending).
 * A club sets an email once and never changes it.
 */

export const NEW_PLAYER_EMAIL_ERROR =
  'Enter an email address, like name@example.com, or leave it empty.'
export const EDIT_PLAYER_EMAIL_ERROR = 'Enter an email address, like name@example.com.'
/** New player: the email typed already belongs to one of the club's saved players. */
export const emailAlreadySaved = (name: string) =>
  `That email is already ${name} in your saved players.`

export type ClubEmailPlan =
  | { kind: 'guest' }
  /** Offline: looked up after the device syncs */
  | { kind: 'pending'; email: string }
  /** The email is a registered ROTRA player's */
  | { kind: 'registered'; email: string; playerId: string }
  /** The email is an unclaimed player another club saved: the same person and RTR ID */
  | { kind: 'unclaimed'; email: string; playerId: string; rtrId: string }
  /** Nobody on ROTRA has it: a new unclaimed player with a new RTR ID */
  | { kind: 'new'; email: string }

/**
 * Reads what saving this email would do, and refuses what can't be saved: a malformed email
 * (`invalid` is the message for the form it was typed in) and a player who is not available.
 * It never checks the club's own saved players: `savedRecordByEmail` does, and each caller
 * decides what that means (New player refuses; Edit details asks "Same person as NAME?").
 */
export function planClubEmail(
  s: MockState,
  typed: string | null | undefined,
  invalid = NEW_PLAYER_EMAIL_ERROR,
  offline = getConnectivity() === 'offline',
): ClubEmailPlan {
  if (!typed?.trim()) return { kind: 'guest' }
  const parsed = emailField.safeParse(typed)
  if (!parsed.success) throw new MockError('permission', invalid, { email: invalid })
  const email = emailKey(parsed.data)
  if (offline) return { kind: 'pending', email }
  const account = accountByEmail(s, email)
  if (!account) return { kind: 'new', email }
  const player = s.players.find((p) => p.id === account.playerId)
  if (!player || s.adminPlayerRecords[player.id]?.archivedAt) {
    const text = 'Player not available.'
    throw new MockError('permission', text, { email: text })
  }
  return account.claimed
    ? { kind: 'registered', email, playerId: player.id }
    : { kind: 'unclaimed', email, playerId: player.id, rtrId: player.rtrId }
}

/** The words after the name in the saved message, for a plan that has not been applied yet. */
export function clubEmailWords(plan: Exclude<ClubEmailPlan, { kind: 'guest' }>, rtrId?: string) {
  if (plan.kind === 'pending') return 'profile lookup after sync'
  if (plan.kind === 'registered') return 'linked to their ROTRA account'
  if (plan.kind === 'unclaimed') return `already on ROTRA · ${plan.rtrId}`
  return rtrId ? `unclaimed · ${rtrId}` : 'unclaimed'
}

/**
 * Applies a plan to the club's record and returns the words for the saved message
 * ("unclaimed · RTR-…", "linked to their ROTRA account", "already on ROTRA · RTR-…" or
 * "profile lookup after sync"). The record keeps the club's own name, nickname, picture and level.
 */
export function applyClubEmail(
  s: MockState,
  row: ClubPlayer,
  plan: Exclude<ClubEmailPlan, { kind: 'guest' }>,
): string {
  if (plan.kind === 'pending') {
    row.identity = 'pending'
    s.pendingEmails = { ...s.pendingEmails, [row.id]: plan.email }
    return clubEmailWords(plan)
  }
  if (s.pendingEmails) delete s.pendingEmails[row.id]
  if (plan.kind === 'registered') {
    row.identity = 'registered'
    row.playerId = plan.playerId
    return clubEmailWords(plan)
  }
  row.identity = 'unclaimed'
  if (plan.kind === 'unclaimed') {
    row.playerId = plan.playerId
    return clubEmailWords(plan)
  }
  const person = createUnclaimedPerson(s, {
    clubId: row.clubId,
    email: plan.email,
    fullName: row.fullName,
    nickname: row.nickname,
  })
  row.playerId = person.id
  syncUnclaimedProjection(s, person.id)
  return clubEmailWords(plan, person.rtrId)
}

/**
 * Lookup pending records after the device synced: each is linked to the ROTRA player with that
 * email or gets an RTR ID. A record whose email turns out to be another saved player of the same
 * club stays Lookup pending: two records are never merged without the Queue Master.
 */
export function resolvePendingEmails(s: MockState) {
  for (const row of s.clubPlayers) {
    const email = s.pendingEmails?.[row.id]
    if (!email || row.identity !== 'pending' || !isCurrentRecord(row)) continue
    if (savedRecordByEmail(s, row.clubId, email, row.id)) continue
    const account = accountByEmail(s, email)
    const unavailable =
      !!account &&
      (!s.players.some((p) => p.id === account.playerId) ||
        !!s.adminPlayerRecords[account.playerId]?.archivedAt)
    if (unavailable) continue
    const plan = planClubEmail(s, email, NEW_PLAYER_EMAIL_ERROR, false)
    if (plan.kind !== 'guest') applyClubEmail(s, row, plan)
  }
}
