import { clubPictureState } from '../club-player/clubPlayerPicture.rules'
import { identityPlayedSeeds } from '../fixtures/unclaimedPlayers'
import { MockError } from '../mock/errors'
import { delay } from '../mock/latency'
import { type MockState, readMockState } from '../mock/store'
import type { PlayingLevel } from '../player/player.types'
import { clubRecordsOf, emailKey, isCurrentRecord } from '../player/unclaimed'
import { isRealDataMode } from '../real/mode'
import { levelLabel } from '../session-roster/sessionRoster.rules'
import { maskPhone } from '@rotra/schema/phone'

/**
 * Registration with an email clubs already saved (D-2026-11-16-04): the person keeps the RTR ID and
 * every club's record under that email joins the account with its games. Matching is by email: the
 * registering person's ROTRA email or their Google email equals the saved one. The phone linking of
 * D-2026-11-11-03 stays beside it for older records that have a phone and no email.
 */

/** One club's version of the person, as that club typed it: an identity card. */
export type UnclaimedIdentityRecord = {
  /** The club's saved-player id: what the picker returns and `identityRecordId` takes */
  id: string
  clubId: string
  clubName: string
  clubInitials: string
  clubLogoUrl: string | null
  name: string
  nickname: string | null
  /** The club's picture of them as an avatar reference (photo or `character:<id>`); null = initials */
  picture: string | null
  level: PlayingLevel | null
  /** "Intermediate Low"; null when the club set no level */
  levelLabel: string | null
  /** Already masked ("+63 918 ••• ••77"); the full number never leaves the store. Null: none */
  maskedPhone: string | null
  /** "March 2023", from the experience the club entered; null: not added */
  playingSince: string | null
  playingStyle: string | null
  /** The providers the club added a link for: "Facebook", "Instagram", "YouTube", "LinkedIn" */
  links: string[]
  /** The date the club saved them ("Sep 2, 2026") */
  saved: string
  /** Played here: games in sessions of this club */
  games: number
  sessions: number
}

/**
 * What registering with this email will claim. `records` has one card per club that saved the
 * email: none or one needs no picker (one prefills Finish registering with that club's details);
 * more than one opens "Which identity is correct?". Picking a card prefills the name, nickname,
 * picture and level only; every record joins the account whichever is picked.
 */
export type UnclaimedIdentities = {
  /** The saved email, as the clubs typed it */
  email: string
  /** The RTR ID the person keeps */
  rtrId: string
  records: UnclaimedIdentityRecord[]
}

const LINK_NAMES = [
  ['facebook', 'Facebook'],
  ['instagram', 'Instagram'],
  ['youtube', 'YouTube'],
  ['linkedin', 'LinkedIn'],
] as const

const day = (at: number, month: 'short' | 'long', withDay: boolean) =>
  new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    month,
    year: 'numeric',
    day: withDay ? 'numeric' : undefined,
  }).format(at)

/** "March 2023": now minus the years and months of experience the club entered. */
function playingSince(years: number | null, months: number | null, now: number) {
  if (years == null && months == null) return null
  const since = new Date(now)
  since.setMonth(since.getMonth() - ((years ?? 0) * 12 + (months ?? 0)))
  return day(since.getTime(), 'long', false)
}

/** Games and sessions the record played at its club: finished sessions and their completed games. */
function playedHere(s: MockState, clubPlayerId: string) {
  const finished = new Set(s.sessions.filter((x) => x.state === 'completed').map((x) => x.id))
  const slots = s.roster.filter((r) => r.clubPlayerId === clubPlayerId && finished.has(r.sessionId))
  if (!slots.length) return identityPlayedSeeds[clubPlayerId] ?? { games: 0, sessions: 0 }
  const ids = new Set(slots.map((r) => r.id))
  return {
    sessions: new Set(slots.map((r) => r.sessionId)).size,
    games: s.matches.filter(
      (m) => m.state === 'completed' && [...m.teamA, ...m.teamB].some((id) => ids.has(id)),
    ).length,
  }
}

/** The unclaimed person whose saved email is one of these (the ROTRA email, then the Google email). */
export function unclaimedAccountFor(s: MockState, emails: (string | null | undefined)[]) {
  for (const email of emails) {
    const key = emailKey(email)
    if (!key) continue
    const account = s.playerAccounts.find((a) => !a.claimed && emailKey(a.email) === key)
    if (account && !s.adminPlayerRecords[account.playerId]?.archivedAt) return account
  }
  return undefined
}

/** The identity cards for an unclaimed person, the first club that saved them first. */
export function unclaimedIdentitiesOf(s: MockState, playerId: string, now = Date.now()) {
  const account = s.playerAccounts.find((a) => a.playerId === playerId)
  const player = s.players.find((p) => p.id === playerId)
  if (!account || account.claimed || !player) return null
  const records = clubRecordsOf(s, playerId)
    .filter((record) => record.identity === 'unclaimed')
    .map((record): UnclaimedIdentityRecord => {
      const club = s.clubs.find((c) => c.id === record.clubId)
      const phone = s.privatePhones[record.id]
      const own = record.details
      return {
        id: record.id,
        clubId: record.clubId,
        clubName: club?.name ?? 'Unknown club',
        clubInitials: club?.initials ?? '',
        clubLogoUrl: club?.logoUrl ?? null,
        name: record.fullName,
        nickname: record.nickname,
        picture: clubPictureState(record, null).reference,
        level: record.playingLevel,
        levelLabel: record.playingLevel ? levelLabel(record.playingLevel) : null,
        maskedPhone: phone ? maskPhone(phone) : null,
        playingSince: own ? playingSince(own.experienceYears, own.experienceMonths, now) : null,
        playingStyle: own?.playingStyle || null,
        links: LINK_NAMES.filter(([key]) => own?.socialLinks[key]).map(([, name]) => name),
        saved: record.addedAt ? day(record.addedAt, 'short', true) : '',
        ...playedHere(s, record.id),
      }
    })
  const identities: UnclaimedIdentities = { email: account.email, rtrId: player.rtrId, records }
  return identities
}

/**
 * The identity cards for the Google account the person just picked, or null when no club saved that
 * email (an ordinary new registration). Only for an email the person has proved is theirs: it is
 * called after Continue with Google, never for an email typed into a form. Real mode (P15.8):
 * `useUnclaimedIdentities` calls `realGetUnclaimedIdentities`, which reads the server's held,
 * verified Google sign-in (this module stays free of the real transport, which server code
 * type-imports through it); here real mode answers null.
 */
export async function getUnclaimedIdentities(
  googleEmail: string,
  signal?: AbortSignal,
): Promise<UnclaimedIdentities | null> {
  if (isRealDataMode()) return null
  await delay(200, signal)
  const s = readMockState()
  const account = unclaimedAccountFor(s, [googleEmail])
  return account ? unclaimedIdentitiesOf(s, account.playerId) : null
}

/**
 * Claims an unclaimed person at registration, inside one store write: the account becomes
 * registered and every club's record under the email joins it (registered, same RTR ID). The
 * profile starts from the picked club's version (`identityRecordId`), or the only club's: its
 * picture. The name and nickname come from the form, which was prefilled from the same record; the
 * level stays each club's own, and rank is untouched. Returns the clubs whose records joined.
 */
export function claimUnclaimedPerson(
  s: MockState,
  playerId: string,
  input: { phone: string; identityRecordId?: string | null },
) {
  const account = s.playerAccounts.find((a) => a.playerId === playerId)
  const profile = s.playerProfiles.find((p) => p.playerId === playerId)
  if (!account || account.claimed || !profile)
    throw new MockError('conflict', 'This profile is already registered.')
  const records = clubRecordsOf(s, playerId)
  const picked =
    records.find((record) => record.id === input.identityRecordId) ??
    (records.length === 1 ? records[0] : undefined)
  if (input.identityRecordId && !picked)
    throw new MockError('conflict', 'That profile is no longer available. Pick again.')
  if (picked?.picture) profile.picture = clubPictureState(picked, null).reference
  account.claimed = true
  account.phone = input.phone
  s.playerRanks[playerId] ??= {
    playerId,
    fullName: profile.fullName,
    nickname: profile.nickname,
    levelIndex: null,
    state: 'provisional',
    updatePending: null,
    position: null,
    recentCount: 0,
    olderCount: 0,
  }
  s.playerGames[playerId] ??= []
  joinClubRecords(s, playerId)
  return {
    joinedClubs: [...new Set(records.map((record) => record.clubId))].map(
      (clubId) => s.clubs.find((c) => c.id === clubId)?.name ?? 'Unknown club',
    ),
  }
}

/** Every club's current record of a person who is now registered reads as registered. */
export function joinClubRecords(s: MockState, playerId: string) {
  for (const record of s.clubPlayers)
    if (record.playerId === playerId && isCurrentRecord(record) && record.identity !== 'registered')
      record.identity = 'registered'
}

/**
 * D-2026-11-11-03, kept beside the email (owner answer for #923): every club's older record
 * with this phone and no email joins the new account, one per club, the earliest saved one.
 */
export function linkPhoneRecords(s: MockState, playerId: string, phone: string) {
  const linkedClubs = new Set(
    s.clubPlayers.filter((p) => p.playerId === playerId && !p.removedAt).map((p) => p.clubId),
  )
  for (const record of [...s.clubPlayers].sort((a, b) => (a.addedAt ?? 0) - (b.addedAt ?? 0))) {
    if (
      record.playerId ||
      !isCurrentRecord(record) ||
      (record.identity !== 'unclaimed' && record.identity !== 'pending') ||
      s.privatePhones[record.id] !== phone ||
      linkedClubs.has(record.clubId)
    )
      continue
    record.playerId = playerId
    record.identity = 'registered'
    linkedClubs.add(record.clubId)
  }
}
