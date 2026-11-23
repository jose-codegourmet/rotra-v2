import { phoneField } from '@rotra/schema/phone'
import { socialLinkAlreadySaved } from '@rotra/schema/social-link'
import { DEMO_CLUB_ID } from '../fixtures/clubs'
import { leaderboardLevels } from '../fixtures/players'
import { MockError } from '../mock/errors'
import type { MockState } from '../mock/store'
import { queueMutation } from '../mock/transaction'
import { PLAYING_LEVELS, type PlayingLevel } from '../player/player.types'
import { isUnclaimedPerson, savedDisplayName, savedRecordByEmail } from '../player/unclaimed'
import { isRealDataMode } from '../real/mode'
import { realAddDirectoryPlayerToClub, realAddNewSavedPlayer } from '../real/queue'
import { levelLabel } from '../session-roster/sessionRoster.rules'
import { savedPlayerName } from './clubNickname.rules'
import type { ClubPlayer, JoinedVia } from './clubPlayer.types'
import { applyClubEmail, emailAlreadySaved, planClubEmail } from './email'
import { applyClubSocial, planClubSocial, savedRecordForSocial } from './socialLink'

function fail(text: string): never {
  throw new MockError('permission', text)
}

/** A directory suggestion's level is its leaderboard level. */
export function directoryLevel(playerId: string): PlayingLevel {
  return leaderboardLevels[playerId] ?? 'beginner_low'
}

/** Add player › Player Information: another club's unclaimed player needs this club's own name. */
export const OWN_NAME_ERROR = 'Enter a name.'

export type NewClubPlayerInput = {
  name: string
  nickname?: string | null
  /** No email saves a guest (D-2026-11-16-04) */
  email?: string | null
  /**
   * Optional, private to the club, kept for an unclaimed player only: refused with no email and no
   * social link, since a guest has no phone (Add player › New player, November 23, 2026)
   */
  phone?: string | null
  /** #1019: a Facebook, Instagram, YouTube or LinkedIn link is an entry key too; it wins over the email */
  socialLink?: string | null
}

const PHONE_ERROR = 'Enter a Philippine mobile number, like 0917 555 0142, or leave it empty.'
const PHONE_NEEDS_KEY = 'Add an email or a social link to save a phone, or leave the phone empty.'

/** The new player's phone as E.164, or null; refuses a bad one, one with no key, or a taken one. */
export function newPlayerPhone(
  s: MockState,
  input: Pick<NewClubPlayerInput, 'phone' | 'email' | 'socialLink'>,
) {
  if (!input.phone?.trim()) return null
  const parsed = phoneField.safeParse(input.phone)
  if (!parsed.success) throw new MockError('permission', PHONE_ERROR, { phone: PHONE_ERROR })
  if (!input.email?.trim() && !input.socialLink?.trim())
    throw new MockError('permission', PHONE_NEEDS_KEY, { phone: PHONE_NEEDS_KEY })
  const taken = s.clubPlayers.find(
    (p) =>
      p.clubId === DEMO_CLUB_ID &&
      !p.removedAt &&
      !p.linkedToClubPlayerId &&
      s.privatePhones[p.id] === parsed.data,
  )
  if (taken) {
    const text = `${savedDisplayName(s, taken)} already has this number.`
    throw new MockError('permission', text, { phone: text })
  }
  return parsed.data
}

/**
 * Creates the saved club player for a new player (D-2026-11-16-04). No email: a guest, a name only.
 * An email: an unclaimed player with a new RTR ID, a link to the ROTRA player who already has that
 * email, or Lookup pending while offline. An email that is already one of the club's saved players
 * is refused. `how` is the end of the saved message (" as a guest", " · unclaimed · RTR-…", …).
 * Shared by the session Add player, Saved players › Add player and a confirmed join request.
 */
export function createClubPlayer(
  s: MockState,
  input: NewClubPlayerInput,
  playingLevel: PlayingLevel | null = null,
): { player: ClubPlayer; how: string } {
  if (!input.name.trim()) fail('Enter your name.')
  const phone = newPlayerPhone(s, input)
  const social = planClubSocial(s, input.socialLink)
  const sameLink = savedRecordForSocial(s, DEMO_CLUB_ID, social)
  if (sameLink) {
    const text = socialLinkAlreadySaved(savedDisplayName(s, sameLink))
    throw new MockError('permission', text, { socialLink: text })
  }
  const plan = planClubEmail(s, input.email)
  // With a link the link decides who they are; the email's own owner is not checked (#1019).
  if (plan.kind !== 'guest' && social.kind === 'none') {
    const same = savedRecordByEmail(s, DEMO_CLUB_ID, plan.email)
    if (same) {
      const text = emailAlreadySaved(savedDisplayName(s, same))
      throw new MockError('permission', text, { email: text })
    }
  }
  const player: ClubPlayer = {
    id: crypto.randomUUID(),
    clubId: DEMO_CLUB_ID,
    playerId: null,
    fullName: input.name.trim(),
    nickname: input.nickname?.trim() || null,
    identity: 'guest',
    playingLevel,
    addedAt: Date.now(),
    joinedVia: 'added',
  }
  s.clubPlayers.push(player)
  if (phone) s.privatePhones[player.id] = phone
  if (social.kind !== 'none') {
    const email = plan.kind === 'new' || plan.kind === 'pending' ? plan.email : null
    return { player, how: ` · ${applyClubSocial(s, player, social, email)}` }
  }
  if (plan.kind === 'guest') return { player, how: ' as a guest' }
  return { player, how: ` · ${applyClubEmail(s, player, plan)}` }
}

/**
 * The saved club player for a ROTRA player found by Player lookup, created when missing: registered
 * for a registered player, and for another club's unclaimed player this club's own record with
 * `ownName` (the club is never shown the other club's name, picture or level). A record the club
 * deleted earlier comes back. `joinedVia` marks a new row only: the join-request confirm path
 * (Q17/Q18) passes `session`. Without a level a registered player starts at their Player
 * Information level and an unclaimed player has none yet.
 */
export function clubPlayerForProfile(
  s: MockState,
  profileId: string,
  playingLevel?: PlayingLevel | null,
  joinedVia: JoinedVia = 'added',
  ownName?: string | null,
) {
  const profile = s.players.find((p) => p.id === profileId)
  if (!profile || s.adminPlayerRecords[profile.id]?.archivedAt) fail('Player not available.')
  const saved = s.clubPlayers.find(
    (p) => p.playerId === profile.id && p.clubId === DEMO_CLUB_ID && !p.linkedToClubPlayerId,
  )
  if (saved && !saved.removedAt) return { player: saved, created: false }
  const unclaimed = isUnclaimedPerson(s, profile.id)
  const fullName = unclaimed ? (ownName?.trim() ?? '') : profile.fullName
  if (!fullName) throw new MockError('permission', OWN_NAME_ERROR, { name: OWN_NAME_ERROR })
  const level =
    playingLevel === undefined ? (unclaimed ? null : directoryLevel(profile.id)) : playingLevel
  if (saved) {
    delete saved.removedAt
    saved.identity = unclaimed ? 'unclaimed' : 'registered'
    saved.fullName = fullName
    if (!unclaimed) saved.nickname = profile.nickname
    saved.playingLevel = level
    return { player: saved, created: true }
  }
  const player: ClubPlayer = {
    id: crypto.randomUUID(),
    clubId: DEMO_CLUB_ID,
    playerId: profile.id,
    fullName,
    nickname: unclaimed ? null : profile.nickname,
    identity: unclaimed ? 'unclaimed' : 'registered',
    playingLevel: level,
    addedAt: Date.now(),
    joinedVia,
  }
  s.clubPlayers.push(player)
  return { player, created: true }
}

const alreadySaved = (name: string) =>
  new MockError('conflict', `${name} is already in your saved players.`)

function savedLevel(level: PlayingLevel | null | undefined) {
  if (level != null && !PLAYING_LEVELS.includes(level)) fail('Choose a level for this club.')
  return level ?? null
}

/**
 * Saved players › Add player › New player: saves a guest (no email), an unclaimed player with a
 * new RTR ID, a link to the ROTRA player who has that email, or a Lookup pending player (offline)
 * to the club's saved players, with the level if one was chosen. Never touches a session. An email
 * that is already a saved player is refused as a field error on `email`; same-name guests are
 * never merged.
 */
export function addNewSavedPlayer(input: NewClubPlayerInput & { level?: PlayingLevel | null }) {
  // Real data: a level is only recorded with a session, so the player is saved without one.
  if (isRealDataMode()) return realAddNewSavedPlayer(input)
  return queueMutation({ area: 'Roster', clubAccess: true }, (s) => {
    const level = savedLevel(input.level)
    const { player, how } = createClubPlayer(s, input, level)
    return { data: { clubPlayerId: player.id }, text: `${player.fullName} saved${how}` }
  })
}

/**
 * Saved players › Add player › Player Information: saves the ROTRA player found by exact RTR ID or
 * email to the club's saved players. A player that is already saved is refused. For a registered
 * player the level defaults to the Player Information suggestion; null saves no level yet. Another
 * club's unclaimed player needs `name`, this club's own name for them ("Enter a name.").
 */
export function addDirectoryPlayerToClub(input: {
  playerId: string
  level?: PlayingLevel | null
  name?: string | null
}) {
  if (isRealDataMode()) return realAddDirectoryPlayerToClub(input)
  return queueMutation({ area: 'Roster', onlineOnly: true, clubAccess: true }, (s) => {
    const level = input.level === undefined ? undefined : savedLevel(input.level)
    const { player, created } = clubPlayerForProfile(s, input.playerId, level, 'added', input.name)
    if (!created) throw alreadySaved(player.fullName)
    const name = savedPlayerName(player)
    return {
      data: { clubPlayerId: player.id },
      text: `${name} saved${player.playingLevel ? ` · ${levelLabel(player.playingLevel)}` : ''}`,
    }
  })
}
