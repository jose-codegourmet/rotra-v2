import type { ClubPlayer } from '../club-player/clubPlayer.types'
import { clubPictureState } from '../club-player/clubPlayerPicture.rules'
import type { MockState } from '../mock/store'
import type { PlayerAccountRecord } from '../player-account/playerAccount.types'
import type { Player } from './player.types'
import { nextRtrId, rtrIdDay, rtrIdPrefix, splitRtrId } from './rtrId'

/**
 * Unclaimed players in the mock store (D-2026-11-16-04). One email is one person and one RTR ID:
 * the shared entry is a `players` row with a `playerAccounts` row that is not claimed and holds the
 * email. Each club that saved the person has its own `clubPlayers` row pointing at it
 * (`identity: 'unclaimed'`), with that club's own name, nickname, picture, level and phone. The
 * `playerProfiles` row is only the public projection: it follows the club's version while exactly
 * one club has the person. An older record with a phone and no email has no shared entry
 * (`playerId: null`) and reads as Details required.
 */

export const emailKey = (email: string | null | undefined) => (email ?? '').trim().toLowerCase()

/** The person, registered or unclaimed, whose ROTRA email this is. */
export function accountByEmail(
  s: MockState,
  email: string | null | undefined,
): PlayerAccountRecord | undefined {
  const key = emailKey(email)
  return key ? s.playerAccounts.find((a) => emailKey(a.email) === key) : undefined
}

/** A person with an RTR ID who has not registered: the shared entry of an unclaimed player. */
export const isUnclaimedPerson = (s: MockState, playerId: string | null | undefined) =>
  !!playerId && s.playerAccounts.some((a) => a.playerId === playerId && !a.claimed)

/** A club's current saved record: not deleted and not moved into another record. */
export const isCurrentRecord = (p: Pick<ClubPlayer, 'removedAt' | 'linkedToClubPlayerId'>) =>
  !p.removedAt && !p.linkedToClubPlayerId

/** An older unclaimed record with a phone and no email: no shared entry and no RTR ID. */
export const isDetailsRequired = (p: Pick<ClubPlayer, 'identity' | 'playerId'>) =>
  p.identity === 'unclaimed' && !p.playerId

/** Every club's current record of one person, the first club that saved them first. */
export function clubRecordsOf(s: MockState, playerId: string): ClubPlayer[] {
  return s.clubPlayers
    .filter((p) => p.playerId === playerId && isCurrentRecord(p))
    .sort((a, b) => (a.addedAt ?? 0) - (b.addedAt ?? 0))
}

/** The saved player of one club that already stands for this email, if any (current records only). */
export function savedRecordByEmail(
  s: MockState,
  clubId: string,
  email: string,
  exceptId?: string,
): ClubPlayer | undefined {
  const key = emailKey(email)
  if (!key) return undefined
  const owner = accountByEmail(s, key)
  return s.clubPlayers.find(
    (p) =>
      p.clubId === clubId &&
      p.id !== exceptId &&
      isCurrentRecord(p) &&
      ((!!owner && p.playerId === owner.playerId) || emailKey(s.pendingEmails?.[p.id]) === key),
  )
}

/** Raises a place and day's counter to at least this RTR ID's number. Counters are never rewound. */
function countRtrId(s: MockState, rtrId: string) {
  const parts = splitRtrId(rtrId)
  if (!parts) return
  s.rtrIdCounters ??= {}
  const counters = s.rtrIdCounters
  counters[parts.prefix] = Math.max(counters[parts.prefix] ?? 0, parts.number)
}

/** The RTR ID the next allocation would give for a founding city code ('PH-CEB'); writes nothing. */
export function peekMockRtrId(s: MockState, placeCode: string, at = Date.now()) {
  const day = rtrIdDay(at)
  return nextRtrId(
    s.players.map((p) => p.rtrId),
    placeCode,
    day,
    s.rtrIdCounters?.[rtrIdPrefix(placeCode, day)] ?? 0,
  )
}

/**
 * Gives the next RTR ID for a founding city code ('PH-CEB') on the day of `at`. The one allocator
 * of the mock store: registration, Admin's Add player and a club saving an email all use it.
 */
export function allocateMockRtrId(s: MockState, placeCode: string, at = Date.now()) {
  const rtrId = peekMockRtrId(s, placeCode, at)
  countRtrId(s, rtrId)
  return rtrId
}

/**
 * The shared entry for a new unclaimed person: the email and a new RTR ID from the club's founding
 * city and today. The place never changes when another club adds the person or when they register.
 */
export function createUnclaimedPerson(
  s: MockState,
  input: { clubId: string; email: string; fullName: string; nickname: string | null },
): Player {
  const club = s.clubs.find((c) => c.id === input.clubId)
  if (!club) throw new Error('An unclaimed player needs the club that saved them.')
  const id = crypto.randomUUID()
  const rtrId = allocateMockRtrId(s, club.locationCode)
  const player: Player = { id, fullName: input.fullName, nickname: input.nickname, rtrId }
  s.players.push(player)
  s.playerProfiles.push({
    playerId: id,
    rtrId,
    fullName: input.fullName,
    nickname: input.nickname,
    picture: null,
    playingStyle: '',
    experienceYears: null,
    experienceMonths: null,
    socialLinks: { facebook: '', instagram: '', youtube: '', linkedin: '' },
  })
  s.playerAccounts.push({
    playerId: id,
    phone: '',
    email: emailKey(input.email),
    phoneHidden: false,
    claimed: false,
  })
  s.adminPlayerRecords[id] = {
    archivedAt: null,
    revision: 1,
    createdByClubId: input.clubId,
    adminCreated: false,
  }
  return player
}

/**
 * The public projection of an unclaimed person follows the club's version while exactly one club
 * has them (they are public, and on the leaderboard, only then). With more clubs it stays as it
 * was: no club's version replaces another's.
 */
export function syncUnclaimedProjection(s: MockState, playerId: string | null | undefined) {
  if (!playerId || !isUnclaimedPerson(s, playerId)) return
  // A player Admin added keeps what Admin entered.
  if (s.adminPlayerRecords[playerId]?.adminCreated) return
  const records = clubRecordsOf(s, playerId)
  const only = records.length === 1 ? records[0] : undefined
  if (!only) return
  const player = s.players.find((p) => p.id === playerId)
  const profile = s.playerProfiles.find((p) => p.playerId === playerId)
  const rank = s.playerRanks[playerId]
  for (const row of [player, profile, rank]) {
    if (!row) continue
    row.fullName = only.fullName
    row.nickname = only.nickname
  }
  if (!profile) return
  if (only.picture) profile.picture = clubPictureState(only, null).reference
  if (only.details) {
    profile.playingStyle = only.details.playingStyle
    profile.experienceYears = only.details.experienceYears
    profile.experienceMonths = only.details.experienceMonths
    profile.socialLinks = { ...only.details.socialLinks }
  }
}

/**
 * After a club deleted its record: when no club has the unclaimed person any more, the shared
 * entry goes and its RTR ID is retired. The counter keeps the number, so it is never given again.
 * A player Admin added stays in Admin. Returns the retired RTR ID, or null when nothing was retired.
 */
export function retireUnsavedPerson(s: MockState, playerId: string | null | undefined) {
  if (!playerId || !isUnclaimedPerson(s, playerId)) return null
  if (clubRecordsOf(s, playerId).length || s.adminPlayerRecords[playerId]?.adminCreated) return null
  const player = s.players.find((p) => p.id === playerId)
  if (!player) return null
  countRtrId(s, player.rtrId)
  s.players = s.players.filter((p) => p.id !== playerId)
  s.playerProfiles = s.playerProfiles.filter((p) => p.playerId !== playerId)
  s.playerAccounts = s.playerAccounts.filter((a) => a.playerId !== playerId)
  delete s.playerRanks[playerId]
  delete s.playerGames[playerId]
  delete s.adminPlayerRecords[playerId]
  for (const [token, link] of Object.entries(s.claimLinks))
    if (link.playerId === playerId) delete s.claimLinks[token]
  // Deleted club records keep their history by club player id; they no longer point at a person.
  for (const row of s.clubPlayers) if (row.playerId === playerId) row.playerId = null
  return player.rtrId
}

/** Activity and sync entries are history: they keep the words written at the time. */
const RTR_ID_HISTORY_KEYS: (keyof MockState)[] = ['adminAuditEvents', 'sync', 'operations']

function replaceExact(value: unknown, from: string, to: string): number {
  if (!value || typeof value !== 'object') return 0
  let replaced = 0
  const holder = value as Record<string, unknown>
  for (const key of Object.keys(holder)) {
    const child = holder[key]
    if (child === from) {
      holder[key] = to
      replaced++
    } else replaced += replaceExact(child, from, to)
  }
  return replaced
}

/**
 * A changed RTR ID cascades (D-2026-11-16-04): every record and snapshot in the store that holds
 * the old RTR ID gets the new one, so nothing but the Activity and sync history still names the old
 * one. There is no alias: the old RTR ID no longer finds the player. The old place and day keep
 * their count, so the old RTR ID is never given to someone else. Returns how many values changed.
 */
export function replaceRtrId(s: MockState, from: string, to: string): number {
  if (from === to) return 0
  countRtrId(s, from)
  countRtrId(s, to)
  let replaced = 0
  for (const key of Object.keys(s) as (keyof MockState)[])
    if (!RTR_ID_HISTORY_KEYS.includes(key)) replaced += replaceExact(s[key], from, to)
  return replaced
}

/** The name a club's saved player shows under: a registered player's own name, else the club's. */
export function savedDisplayName(s: MockState, row: ClubPlayer): string {
  if (row.identity !== 'registered' || !row.playerId) return row.fullName
  return s.playerProfiles.find((p) => p.playerId === row.playerId)?.fullName || row.fullName
}
