import type { PlayerProfile } from '../player/player.types'
import portraits from './playerPortraits.json'
import { players } from './players'

// Vector artwork copied from rotra-player.html faceSVG(), with its original bN/u1 seeds.
// These are image asset colours, not interface theme colours.
const pictures: Record<string, string> = portraits
export const playerProfiles: PlayerProfile[] = players.map((player) => {
  const jose = player.fullName === 'Jose'
  const raymark = player.rtrId === 'RTR-PH-CEB-040226-0007'
  return {
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
