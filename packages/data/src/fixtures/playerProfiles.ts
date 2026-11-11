import type { PlayerProfile } from '../player/player.types'
import portraits from './playerPortraits.json'
import { leaderboardPlayers, players } from './players'

// Vector artwork copied from rotra-player.html faceSVG(), with its original bN/u1 seeds.
// These are image asset colours, not interface theme colours.
const pictures: Record<string, string> = portraits
/**
 * #715 (D-2026-11-12-01) for #731: two always-private players on tonight's roster, at the
 * prototype's places (p9 and p14): Albion and Emji.
 */
const ALWAYS_PRIVATE_PLAYER_IDS = [
  '85ae7866-ff62-59fc-8af8-985a594bb5b2',
  '9f83495f-9359-5f7f-82ad-4cf01b826471',
]
/** Two sample private profiles (leaderboard positions 6 and 10), so visitors see the masking and the gate. */
const PRIVATE_PLAYER_IDS = [leaderboardPlayers[5]?.id, leaderboardPlayers[9]?.id]
/** Three registered players hidden from Player Information (rotra-player.html HIDDEN_SEED: positions 4, 21 and 42). */
const HIDDEN_FROM_DIRECTORY_IDS = [
  leaderboardPlayers[3]?.id,
  leaderboardPlayers[20]?.id,
  leaderboardPlayers[41]?.id,
]
export const playerProfiles: PlayerProfile[] = players.map((player) => {
  const jose = player.fullName === 'Jose'
  const raymark = player.rtrId === 'RTR-PH-CEB-040226-0007'
  return {
    // Existing mock Private flags map to private, the rest to public; the seeded Jose stays public.
    profileVisibility: ALWAYS_PRIVATE_PLAYER_IDS.includes(player.id)
      ? 'always_private'
      : PRIVATE_PLAYER_IDS.includes(player.id)
        ? 'private'
        : 'public',
    hiddenFromDirectory: HIDDEN_FROM_DIRECTORY_IDS.includes(player.id),
    playerId: player.id,
    rtrId: player.rtrId,
    fullName: player.fullName,
    nickname: player.nickname,
    picture: pictures[player.id] ?? null,
    playingStyle: jose
      ? 'Doubles, mostly at the front. I like fast drives and net kills, and I am working on my clears.'
      : '',
    experienceYears: jose ? 4 : null,
    experienceMonths: jose ? 6 : null,
    socialLinks: {
      facebook: jose
        ? 'https://facebook.com/rotra.demo.player'
        : raymark
          ? 'https://facebook.com/rotra.demo.raymark'
          : '',
      instagram: jose ? 'https://instagram.com/rotra.demo.player' : '',
      youtube: '',
      linkedin: '',
    },
  }
})

const raymark = playerProfiles.find((profile) => profile.rtrId === 'RTR-PH-CEB-040226-0007')
if (!raymark) throw new Error('Missing Raymark profile fixture.')
/** Story-only variants of real fixtures, for wrapping and empty-detail states. */
export const playerProfileScenarios = {
  longNames: {
    ...raymark,
    fullName: 'Maria Consolacion Villanueva-Bautista',
    nickname: 'The Unstoppable Shuttle Commander',
  },
} satisfies Record<string, PlayerProfile>

/** Edit-profile input that breaks every personal rule, for form error stories. */
export const profileEditScenarios = {
  invalid: {
    fullName: '',
    nickname: 'The Unstoppable Shuttle Commander',
    playingStyle: '',
    experienceYears: '81',
    experienceMonths: '12',
    facebook: 'https://facebook.com.evil.example/x',
    instagram: 'ftp://instagram.com/x',
    youtube: 'youtube',
    linkedin: 'https://example.com/in/x',
  },
}
