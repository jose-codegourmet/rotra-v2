import type { ClubPlayer } from '../club-player/clubPlayer.types'
import { PLAYING_LEVELS, type Player, type PlayingLevel } from '../player/player.types'
import seed from './players.seed.json'

/** The demo player pool: every identity the three apps show, with canonical shared RTR IDs. */
export const players: Player[] = seed.players

const playersById = new Map(players.map((player) => [player.id, player]))
function selectPlayers(ids: string[]): Player[] {
  return ids.map((id) => {
    const player = playersById.get(id)
    if (!player) throw new Error('A prototype fixture references a missing player.')
    return player
  })
}
function toLevel(value: string): PlayingLevel {
  const level = PLAYING_LEVELS.find((entry) => entry === value)
  if (!level) throw new Error('The leaderboard seed has an unknown playing level.')
  return level
}

/** Admin Players list: every player. */
export const adminPlayers = selectPlayers(seed.adminPlayerIds)

/** Ranked identities, from Advanced down to Beginner. */
export const leaderboardPlayers = selectPlayers(seed.leaderboard.map((entry) => entry.playerId))

/** Each leaderboard player's level, by player ID. */
export const leaderboardLevels: Record<string, PlayingLevel> = Object.fromEntries(
  seed.leaderboard.map((entry) => [entry.playerId, toLevel(entry.playingLevel)]),
)

/** The signed-in demo player in the Player app. */
export const JOSE_PLAYER_ID = '2c7f6a7b-eed9-5051-9426-6dbce5133fbc'

/** Queue's four directory suggestions (not yet saved club players). */
export const directoryPlayers = selectPlayers(seed.directoryPlayerIds)

/** Queue's 20 saved players, all registered. */
export const clubPlayers = [
  {
    id: 'c3e0d1c0-f087-5514-8c94-7ce61c54ed3f',
    clubId: '6cd364d4-0e3a-5c3d-9e75-2116cc845714',
    playerId: '2c7f6a7b-eed9-5051-9426-6dbce5133fbc',
    fullName: 'Jose',
    nickname: null,
    identity: 'registered',
    playingLevel: 'intermediate_low',
  },
  {
    id: '62dc8cc2-6673-5356-b659-51e1fa5d533c',
    clubId: '6cd364d4-0e3a-5c3d-9e75-2116cc845714',
    playerId: 'f4081566-70ef-5fdf-a824-b84d69ddad2f',
    fullName: 'Aaron',
    nickname: null,
    identity: 'registered',
    playingLevel: 'intermediate_high',
  },
  {
    id: '81477e7c-8d55-5b0c-a9a4-b77f54652a0e',
    clubId: '6cd364d4-0e3a-5c3d-9e75-2116cc845714',
    playerId: 'bc4c3446-0131-591b-ab03-af19225dbe8a',
    fullName: 'Raymark',
    nickname: null,
    identity: 'registered',
    playingLevel: 'intermediate_high',
  },
  {
    id: '86107d84-f50e-5903-8107-12a51cb04f5f',
    clubId: '6cd364d4-0e3a-5c3d-9e75-2116cc845714',
    playerId: 'f5a63c91-34fd-53ec-948d-0ef644b5aeac',
    fullName: 'Mikee Abellana',
    nickname: null,
    identity: 'registered',
    playingLevel: 'intermediate_mid',
  },
  {
    id: 'a81bdb0d-e70c-5c8d-9581-da1ef734d0ba',
    clubId: '6cd364d4-0e3a-5c3d-9e75-2116cc845714',
    playerId: '2b4ebc86-5799-5c21-8005-b7c7a82f373c',
    fullName: 'Gab',
    nickname: null,
    identity: 'registered',
    playingLevel: 'advanced_mid',
  },
  {
    id: '84fd1240-17b2-5e17-8647-d8dc7d4f4b64',
    clubId: '6cd364d4-0e3a-5c3d-9e75-2116cc845714',
    playerId: 'a5c35992-7597-55cd-bdf9-20c7a9440af4',
    fullName: 'Dexter',
    nickname: null,
    identity: 'registered',
    playingLevel: 'intermediate_mid',
  },
  {
    id: 'a8e95e02-f2d7-574d-97c7-26ee8abe0bc0',
    clubId: '6cd364d4-0e3a-5c3d-9e75-2116cc845714',
    playerId: '80861dfd-99c7-57bb-a46c-d8c76e9a8dcc',
    fullName: 'Dalton',
    nickname: null,
    identity: 'registered',
    playingLevel: 'intermediate_mid',
  },
  {
    id: '04e75a8d-2abd-5f74-bb29-50234babc853',
    clubId: '6cd364d4-0e3a-5c3d-9e75-2116cc845714',
    playerId: '8f054e7e-aefb-5d54-b5bb-b245f8673b3a',
    fullName: 'Joeriz',
    nickname: null,
    identity: 'registered',
    playingLevel: 'beginner_high',
  },
  {
    id: 'c927b4df-93eb-5e9a-a042-d6db900e2788',
    clubId: '6cd364d4-0e3a-5c3d-9e75-2116cc845714',
    playerId: '85ae7866-ff62-59fc-8af8-985a594bb5b2',
    fullName: 'Albion',
    nickname: null,
    identity: 'registered',
    playingLevel: 'intermediate_mid',
  },
  {
    id: 'af53ebbc-d70a-5d2b-9a2f-d4eea6b2e2af',
    clubId: '6cd364d4-0e3a-5c3d-9e75-2116cc845714',
    playerId: '80726593-1823-5c2d-a3fc-5f904e414d80',
    fullName: 'Vince',
    nickname: null,
    identity: 'registered',
    playingLevel: 'intermediate_mid',
  },
  {
    id: 'd566cf90-560d-59a0-8a25-8aad6f9f4a2f',
    clubId: '6cd364d4-0e3a-5c3d-9e75-2116cc845714',
    playerId: 'd720c601-da89-5474-9351-00e2fb966e56',
    fullName: 'Karl',
    nickname: null,
    identity: 'registered',
    playingLevel: 'advanced_mid',
  },
  {
    id: '1a31f9b1-a7b8-5f8a-b2ed-28bc867e14d1',
    clubId: '6cd364d4-0e3a-5c3d-9e75-2116cc845714',
    playerId: '66f774e9-3b82-5631-931c-9858ff8eb01f',
    fullName: 'Klod',
    nickname: null,
    identity: 'registered',
    playingLevel: 'intermediate_low',
  },
  {
    id: '0cdbe83b-71ae-5b60-9904-5bbc97cc5d65',
    clubId: '6cd364d4-0e3a-5c3d-9e75-2116cc845714',
    playerId: 'a22725ed-0ae7-5f29-9ca8-edf1c775b833',
    fullName: 'Jasper',
    nickname: null,
    identity: 'registered',
    playingLevel: 'intermediate_mid',
  },
  {
    id: '54cd5564-f545-59b2-a4c2-b2b010437774',
    clubId: '6cd364d4-0e3a-5c3d-9e75-2116cc845714',
    playerId: '9f83495f-9359-5f7f-82ad-4cf01b826471',
    fullName: 'Emji',
    nickname: null,
    identity: 'registered',
    playingLevel: 'advanced_mid',
  },
  {
    id: 'b7e2b04d-f7dc-5b0c-b8ce-80a3c9f0a468',
    clubId: '6cd364d4-0e3a-5c3d-9e75-2116cc845714',
    playerId: 'bdc00b5e-c882-52d6-ae19-260104a128ab',
    fullName: 'Russel',
    nickname: null,
    identity: 'registered',
    playingLevel: 'advanced_mid',
  },
  {
    id: '4f306c0d-efa8-5aa5-8518-a05f0bcc2891',
    clubId: '6cd364d4-0e3a-5c3d-9e75-2116cc845714',
    playerId: '9ae806f4-34ca-5d7d-9574-3169567945bf',
    fullName: 'Santino',
    nickname: null,
    identity: 'registered',
    playingLevel: 'intermediate_mid',
  },
  {
    id: 'e327d389-a804-5b91-a047-adc2dd7b3168',
    clubId: '6cd364d4-0e3a-5c3d-9e75-2116cc845714',
    playerId: 'b789f194-76fb-5a5b-ad80-a37f022a785a',
    fullName: 'Andrew',
    nickname: null,
    identity: 'registered',
    playingLevel: 'intermediate_low',
  },
  {
    id: '1594ec21-58df-5c86-817b-2eff9e63e70c',
    clubId: '6cd364d4-0e3a-5c3d-9e75-2116cc845714',
    playerId: 'b181416a-4006-5133-a6a3-521c33a16273',
    fullName: 'Derrick',
    nickname: null,
    identity: 'registered',
    playingLevel: 'intermediate_low',
  },
  {
    id: '703ff4c1-3676-5912-8630-b5d4f756490c',
    clubId: '6cd364d4-0e3a-5c3d-9e75-2116cc845714',
    playerId: 'e8a7e34b-bd3d-5fc4-8331-a20031a545b9',
    fullName: 'Nathan',
    nickname: null,
    identity: 'registered',
    playingLevel: 'advanced_mid',
  },
  {
    id: '81f2ad7f-728c-5bc8-9df5-d2f6c993a405',
    clubId: '6cd364d4-0e3a-5c3d-9e75-2116cc845714',
    playerId: 'd0c2f1f2-5868-5260-b8dc-f9c8a75c3a58',
    fullName: 'Trixie',
    nickname: null,
    identity: 'registered',
    playingLevel: 'beginner_high',
  },
] satisfies ClubPlayer[]

/**
 * Story-only club players for the guest and unclaimed states. Every demo club player is registered,
 * so these placeholders are not in clubPlayers or the mock store.
 */
export const storyIdentityPlayers = {
  guest: {
    id: 'story-guest',
    clubId: '6cd364d4-0e3a-5c3d-9e75-2116cc845714',
    playerId: null,
    fullName: 'Walk-in Guest',
    nickname: null,
    identity: 'guest',
    playingLevel: null,
  },
  unclaimed: {
    id: 'story-unclaimed',
    clubId: '6cd364d4-0e3a-5c3d-9e75-2116cc845714',
    playerId: null,
    fullName: 'Unclaimed Profile',
    nickname: null,
    identity: 'unclaimed',
    playingLevel: 'intermediate_mid',
  },
} satisfies Record<string, ClubPlayer>
