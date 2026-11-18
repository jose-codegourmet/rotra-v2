import type {
  ClubPlayer,
  ClubPlayerOwnDetails,
  ClubPlayerPicture,
} from '../club-player/clubPlayer.types'
import { clubPictureState } from '../club-player/clubPlayerPicture.rules'
import type { MockState } from '../mock/store'
import type { PlayingLevel } from '../player/player.types'
import { DEMO_CLUB_ID } from './clubs'
import { directoryPlayers, GAB_CLUB_PLAYER_ID, GAB_PHONE_E164, GAB_PLAYER_ID } from './players'

/**
 * Sample players for the four statuses of D-2026-11-16-04, seeded into the mock store only (the
 * shared `clubPlayers` pool stays the registered saved players plus Gab Torres).
 *
 * - Queue (rotra-queue.html seedPlayers): Jomar dela Cruz, Nina Ocampo, Gab Torres and Faye
 *   Dimaculangan are unclaimed with an email and an RTR ID; Joanna Tan and Mika Soriano are older
 *   records with a phone and no email (Details required). Ivan dela Rosa is another club's
 *   unclaimed player (the prototype's DIRECTORY g5): Player lookup shows "Not registered yet".
 * - Player (rotra-player.html UNCLAIMED_BY_EMAIL): Jomar's email is saved by one club, Paolo
 *   Mendoza's by two clubs under two names, which opens the identity picker on registration.
 * - Admin (rotra-admin.html): Nina Ocampo is saved by two clubs under different names; Joanna Tan
 *   and one generated record (fixtures/adminPlayerManagement) are Details required.
 *
 * One email is one person in the shared store, so the three prototypes' Nina Ocampo is one person
 * here: saved by Lahug Smash Club (Queue's) and by IT Park Badminton Club as "Nina O." (Admin's
 * second club). The leaderboard's two unclaimed rows are marked in fixtures/leaderboardHistory.
 */

const DAY = 86_400_000
const IT_PARK_CLUB_ID = '3f8ad2ed-5978-5a6a-b3ba-10efdf750f53'
const SAMPALOC_CLUB_ID = '6982df14-0798-5005-902d-06463d401125'

/** Emails and RTR IDs to type in the mock app (the Queue prototype's tip under Player lookup). */
export const unclaimedFixtures = {
  /** Saved by Lahug Smash Club only: registering with it claims that record; no identity picker */
  oneClubEmail: 'jomar.delacruz@example.com',
  /** Saved by two clubs under two names: registering with it opens the identity picker */
  twoClubEmail: 'paolo.mendoza@example.com',
  /** Another club's unclaimed player, as Queue's Player lookup finds them: "Not registered yet" */
  otherClubEmail: 'ivan.delarosa@example.com',
  otherClubRtrId: 'RTR-PH-MNL-090126-0203',
  /** A registered player not yet in the demo club's saved players (the directory's first) */
  registeredRtrId: 'RTR-PH-MNL-020326-0112',
  registeredEmail: 'camill@example.com',
  /** Unclaimed, saved by two clubs under different names (Admin › Players) */
  twoClubNamesEmail: 'nina.ocampo@example.com',
  /** Already in the demo club's saved players: lookup answers "NAME is already in your saved players." */
  savedRtrId: 'RTR-PH-CEB-052026-0017',
} as const

type RecordSeed = {
  id: string
  clubId: string
  fullName: string
  nickname: string | null
  playingLevel: PlayingLevel | null
  /** The club's own private phone, E.164 */
  phone?: string
  /** Days before the store was seeded, or a fixed date for the identity cards' Saved line */
  added: { daysAgo: number } | { at: number }
  picture?: ClubPlayerPicture
  details?: ClubPlayerOwnDetails
}
type PersonSeed = {
  id: string
  rtrId: string
  email: string
  /** The public projection: the first club's version */
  fullName: string
  nickname: string | null
  records: RecordSeed[]
}

const noLinks = { facebook: '', instagram: '', youtube: '', linkedin: '' }

const people: PersonSeed[] = [
  {
    id: 'player-jomar-dela-cruz',
    rtrId: 'RTR-PH-CEB-052026-0017',
    email: unclaimedFixtures.oneClubEmail,
    fullName: 'Jomar dela Cruz',
    nickname: 'Jom',
    records: [
      {
        id: 'club-player-jomar-dela-cruz',
        clubId: DEMO_CLUB_ID,
        fullName: 'Jomar dela Cruz',
        nickname: 'Jom',
        playingLevel: 'intermediate_high',
        phone: '+639185550317',
        added: { daysAgo: 182 },
      },
    ],
  },
  {
    id: 'player-nina-ocampo',
    rtrId: 'RTR-PH-CEB-080526-0036',
    email: unclaimedFixtures.twoClubNamesEmail,
    fullName: 'Nina Ocampo',
    nickname: null,
    records: [
      {
        id: 'club-player-nina-ocampo',
        clubId: DEMO_CLUB_ID,
        fullName: 'Nina Ocampo',
        nickname: null,
        playingLevel: 'intermediate_low',
        phone: '+639175550388',
        added: { daysAgo: 105 },
      },
      {
        id: 'club-player-nina-ocampo-it-park',
        clubId: IT_PARK_CLUB_ID,
        fullName: 'Nina O.',
        nickname: null,
        playingLevel: 'beginner_high',
        added: { daysAgo: 40 },
      },
    ],
  },
  {
    // Gab's club record is in the shared `clubPlayers` pool (fixtures/players).
    id: GAB_PLAYER_ID,
    rtrId: 'RTR-PH-CEB-093026-0058',
    email: 'gab.torres@example.com',
    fullName: 'Gab Torres',
    nickname: null,
    records: [],
  },
  {
    id: 'player-faye-dimaculangan',
    rtrId: 'RTR-PH-CEB-110226-0083',
    email: 'faye.dimaculangan@example.com',
    fullName: 'Faye Dimaculangan',
    nickname: null,
    records: [
      {
        id: 'club-player-faye-dimaculangan',
        clubId: DEMO_CLUB_ID,
        fullName: 'Faye Dimaculangan',
        nickname: null,
        playingLevel: 'intermediate_low',
        added: { daysAgo: 16 },
      },
    ],
  },
  {
    id: 'player-paolo-mendoza',
    rtrId: 'RTR-PH-CEB-090226-0412',
    email: unclaimedFixtures.twoClubEmail,
    fullName: 'Paolo Mendoza',
    nickname: 'Pao',
    records: [
      {
        id: 'club-player-paolo-mendoza',
        clubId: DEMO_CLUB_ID,
        fullName: 'Paolo Mendoza',
        nickname: 'Pao',
        playingLevel: 'intermediate_mid',
        phone: '+639175550164',
        // September 2, 2026 (Asia/Manila)
        added: { at: Date.UTC(2026, 8, 2, 4) },
        picture: { kind: 'character', characterId: 'c' },
        details: {
          playingStyle: 'Fast drives. Likes the front court.',
          experienceYears: 3,
          experienceMonths: 8,
          socialLinks: {
            ...noLinks,
            facebook: 'https://facebook.com/rotra.demo.paolo',
            instagram: 'https://instagram.com/rotra.demo.paolo',
          },
        },
      },
      {
        id: 'club-player-paulo-mendoza-it-park',
        clubId: IT_PARK_CLUB_ID,
        fullName: 'Paulo Mendoza',
        nickname: null,
        playingLevel: 'intermediate_low',
        // October 19, 2026 (Asia/Manila)
        added: { at: Date.UTC(2026, 9, 19, 4) },
      },
    ],
  },
  {
    id: 'player-ivan-dela-rosa',
    rtrId: unclaimedFixtures.otherClubRtrId,
    email: unclaimedFixtures.otherClubEmail,
    fullName: 'Ivan dela Rosa',
    nickname: null,
    records: [
      {
        id: 'club-player-ivan-dela-rosa',
        clubId: SAMPALOC_CLUB_ID,
        fullName: 'Ivan dela Rosa',
        nickname: null,
        playingLevel: 'intermediate_mid',
        added: { daysAgo: 78 },
      },
    ],
  },
]

/** Older unclaimed records: a phone, no email, no RTR ID. They read as Details required. */
const olderRecords: RecordSeed[] = [
  {
    id: 'club-player-joanna-tan',
    clubId: DEMO_CLUB_ID,
    fullName: 'Joanna Tan',
    nickname: 'Jo',
    playingLevel: 'intermediate_low',
    phone: '+639195550702',
    added: { daysAgo: 150 },
  },
  {
    id: 'club-player-mika-soriano',
    clubId: DEMO_CLUB_ID,
    fullName: 'Mika Soriano',
    nickname: null,
    playingLevel: 'beginner_high',
    phone: '+639205550823',
    added: { daysAgo: 60 },
  },
]

/**
 * "Played here" on the identity cards (rotra-player.html UNCLAIMED_BY_EMAIL), by club player id.
 * The sample clubs have no finished sessions with these players in the store, so the counts are
 * the prototype's; a record with real session rows is counted from them instead.
 */
export const identityPlayedSeeds: Record<string, { games: number; sessions: number }> = {
  'club-player-paolo-mendoza': { games: 14, sessions: 6 },
  'club-player-paulo-mendoza-it-park': { games: 5, sessions: 2 },
}

function addRecord(state: MockState, seed: RecordSeed, playerId: string | null, now: number) {
  const record: ClubPlayer = {
    id: seed.id,
    clubId: seed.clubId,
    playerId,
    fullName: seed.fullName,
    nickname: seed.nickname,
    identity: 'unclaimed',
    playingLevel: seed.playingLevel,
    addedAt: 'at' in seed.added ? seed.added.at : now - seed.added.daysAgo * DAY,
    joinedVia: 'added',
  }
  if (seed.picture) record.picture = seed.picture
  if (seed.details) record.details = seed.details
  state.clubPlayers.push(record)
  if (seed.phone) state.privatePhones[seed.id] = seed.phone
}

/** Seeds the unclaimed sample players, the older records and the directory players' accounts. */
export function seedUnclaimedPlayers(state: MockState, now = Date.now()) {
  for (const person of people) {
    const [first] = person.records
    state.players.push({
      id: person.id,
      fullName: person.fullName,
      nickname: person.nickname,
      rtrId: person.rtrId,
    })
    state.playerProfiles.push({
      playerId: person.id,
      rtrId: person.rtrId,
      fullName: person.fullName,
      nickname: person.nickname,
      picture: first?.picture
        ? clubPictureState({ identity: 'unclaimed', picture: first.picture }, null).reference
        : null,
      playingStyle: first?.details?.playingStyle ?? '',
      experienceYears: first?.details?.experienceYears ?? null,
      experienceMonths: first?.details?.experienceMonths ?? null,
      socialLinks: { ...(first?.details?.socialLinks ?? noLinks) },
    })
    state.playerAccounts.push({
      playerId: person.id,
      phone: '',
      email: person.email,
      phoneHidden: false,
      claimed: false,
    })
    state.adminPlayerRecords[person.id] = {
      archivedAt: null,
      revision: 1,
      createdByClubId: first?.clubId ?? DEMO_CLUB_ID,
      adminCreated: false,
    }
    for (const record of person.records) addRecord(state, record, person.id, now)
  }
  state.privatePhones[GAB_CLUB_PLAYER_ID] = GAB_PHONE_E164
  for (const record of olderRecords) addRecord(state, record, null, now)
  // Registered players Player lookup can find by email as well as by RTR ID (the directory pool).
  for (const [index, player] of directoryPlayers.entries()) {
    if (state.playerAccounts.some((a) => a.playerId === player.id)) continue
    state.playerAccounts.push({
      playerId: player.id,
      phone: `+63917555020${index + 1}`,
      email: `${player.fullName.split(' ')[0]?.toLowerCase() ?? 'player'}@example.com`,
      phoneHidden: false,
      claimed: true,
      emailConfirmedAt: '2026-11-01T00:00:00Z',
    })
  }
}
