import {
  type NormalizedSocialLink,
  normalizeSocialLink,
  SOCIAL_LINK_ERROR,
  socialLinkKeys,
} from '@rotra/schema/social-link'
import { getConnectivity } from '../connectivity/connectivity'
import { MockError } from '../mock/errors'
import type { MockState } from '../mock/store'
import {
  accountByEmail,
  accountBySocialKey,
  createUnclaimedPerson,
  emailKey,
  isCurrentRecord,
  retireUnsavedPerson,
  savedRecordBySocialKey,
  syncUnclaimedProjection,
} from '../player/unclaimed'
import type { ClubPlayer, ClubPlayerOwnDetails } from './clubPlayer.types'

/**
 * What a social link does to a club's new record (#1019, rotra-queue.html applySocial()): like an
 * email it is an entry key for an unclaimed player. A new link makes an unclaimed player with an
 * RTR ID; a link that is already an unclaimed player on ROTRA links the record to that person and
 * RTR ID; offline the lookup waits for sync (Lookup pending). A registered player is never matched
 * by a link. When the email and the link point to two different unclaimed players, the link wins.
 */

export type ClubSocialPlan =
  | { kind: 'none' }
  | { kind: 'pending'; link: NormalizedSocialLink }
  | { kind: 'unclaimed'; link: NormalizedSocialLink; playerId: string; rtrId: string }
  | { kind: 'new'; link: NormalizedSocialLink }

const NO_LINKS = { facebook: '', instagram: '', youtube: '', linkedin: '' }
const NO_DETAILS: ClubPlayerOwnDetails = {
  playingStyle: '',
  experienceYears: null,
  experienceMonths: null,
  socialLinks: NO_LINKS,
}

/** Reads what saving this link would do; refuses a link that is not a profile on the four sites. */
export function planClubSocial(
  s: MockState,
  typed: string | null | undefined,
  offline = getConnectivity() === 'offline',
): ClubSocialPlan {
  if (!typed?.trim()) return { kind: 'none' }
  const link = normalizeSocialLink(typed)
  if (!link) throw new MockError('permission', SOCIAL_LINK_ERROR, { socialLink: SOCIAL_LINK_ERROR })
  if (offline) return { kind: 'pending', link }
  const account = accountBySocialKey(s, link.key)
  if (!account) return { kind: 'new', link }
  const player = s.players.find((p) => p.id === account.playerId)
  if (!player || s.adminPlayerRecords[player.id]?.archivedAt) {
    const text = 'Player not available.'
    throw new MockError('permission', text, { socialLink: text })
  }
  return { kind: 'unclaimed', link, playerId: player.id, rtrId: player.rtrId }
}

/** The club's saved player that already has this link, if the plan has one. */
export function savedRecordForSocial(s: MockState, clubId: string, plan: ClubSocialPlan) {
  return plan.kind === 'none' ? undefined : savedRecordBySocialKey(s, clubId, plan.link.key)
}

/** The words after the name in the saved message, for a plan that has not been applied yet. */
export function clubSocialWords(plan: Exclude<ClubSocialPlan, { kind: 'none' }>, rtrId?: string) {
  if (plan.kind === 'pending') return 'profile lookup after sync'
  if (plan.kind === 'unclaimed') return `already on ROTRA · ${plan.rtrId}`
  return rtrId ? `unclaimed · ${rtrId}` : 'unclaimed'
}

/** Puts the link in the club's own details: it is public on the player's profile card. */
function keepLink(row: ClubPlayer, link: NormalizedSocialLink) {
  const own = row.details ?? NO_DETAILS
  row.details = { ...own, socialLinks: { ...own.socialLinks, [link.provider]: link.url } }
}

/**
 * Applies a link plan to the club's record and returns the words for the saved message. `email`
 * is the email typed with it, if any: a new person keeps it when nobody on ROTRA has it yet.
 */
export function applyClubSocial(
  s: MockState,
  row: ClubPlayer,
  plan: Exclude<ClubSocialPlan, { kind: 'none' }>,
  email?: string | null,
): string {
  keepLink(row, plan.link)
  if (plan.kind === 'pending') {
    row.identity = 'pending'
    s.pendingSocialLinks = { ...s.pendingSocialLinks, [row.id]: plan.link.url }
    if (email) s.pendingEmails = { ...s.pendingEmails, [row.id]: emailKey(email) }
    return clubSocialWords(plan)
  }
  if (s.pendingSocialLinks) delete s.pendingSocialLinks[row.id]
  if (s.pendingEmails) delete s.pendingEmails[row.id]
  row.identity = 'unclaimed'
  if (plan.kind === 'unclaimed') {
    row.playerId = plan.playerId
    syncUnclaimedProjection(s, plan.playerId)
    return clubSocialWords(plan)
  }
  const person = createUnclaimedPerson(s, {
    clubId: row.clubId,
    email: email && !accountByEmail(s, email) ? email : null,
    socialKey: plan.link.key,
    fullName: row.fullName,
    nickname: row.nickname,
  })
  row.playerId = person.id
  syncUnclaimedProjection(s, person.id)
  return clubSocialWords(plan, person.rtrId)
}

/**
 * Lookup pending records with a social link, after the device synced: each is linked to the
 * unclaimed player with that link or gets an RTR ID. A record whose link turns out to be another
 * saved player of the same club stays Lookup pending: two records are never merged silently.
 */
export function resolvePendingSocialLinks(s: MockState) {
  for (const row of s.clubPlayers) {
    const typed = s.pendingSocialLinks?.[row.id]
    if (!typed || row.identity !== 'pending' || !isCurrentRecord(row)) continue
    const plan = planClubSocial(s, typed, false)
    if (plan.kind === 'none' || savedRecordForSocial(s, row.clubId, plan)) continue
    if (plan.kind === 'unclaimed' && s.adminPlayerRecords[plan.playerId]?.archivedAt) continue
    applyClubSocial(s, row, plan, s.pendingEmails?.[row.id])
  }
}

/**
 * Edit details saved new profile links for an unclaimed record (#1019, decisions 6 and 8): the
 * shared entry's key follows the club's links. A key the entry no longer has in them is dropped;
 * the first link no other unclaimed player holds becomes the key when the entry has none. With no
 * email and no key left, this club's record goes back to being a guest (`true`), and the entry is
 * retired when no club has it any more.
 */
export function followClubLinks(s: MockState, row: ClubPlayer): boolean {
  if (row.identity !== 'unclaimed' || !row.playerId) return false
  const account = s.playerAccounts.find((a) => a.playerId === row.playerId && !a.claimed)
  if (!account) return false
  const keys = socialLinkKeys(row.details?.socialLinks)
  if (account.socialKey && !keys.includes(account.socialKey)) account.socialKey = null
  if (!account.socialKey)
    account.socialKey =
      keys.find((key) => !accountBySocialKey(s, key) || accountBySocialKey(s, key) === account) ??
      null
  if (account.socialKey || account.email.trim()) return false
  const personId = row.playerId
  row.identity = 'guest'
  row.playerId = null
  row.details = undefined
  if (!retireUnsavedPerson(s, personId)) syncUnclaimedProjection(s, personId)
  return true
}

/** A record saved with a social link only: an email typed in Edit details is kept when it is free. */
export function addEmailToLinkedEntry(s: MockState, row: ClubPlayer, email: string) {
  const account = s.playerAccounts.find((a) => a.playerId === row.playerId && !a.claimed)
  if (!account || account.email.trim() || accountByEmail(s, email)) return false
  account.email = emailKey(email)
  return true
}
