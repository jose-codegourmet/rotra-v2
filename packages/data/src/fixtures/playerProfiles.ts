import type { PlayerProfile } from '../player/player.types'
import portraits from './playerPortraits.json'
import { players } from './players'

// Vector artwork copied from rotra-player.html faceSVG(), with its original bN/u1 seeds.
// These are image asset colours, not interface theme colours.
const pictures: Record<string, string> = portraits
export const playerProfiles: PlayerProfile[] = players.map((player) => {
  const migs = player.nickname === 'Migs'
  const jomar = player.rtrId === 'RTR-PH-CEB-040226-0007'
  return {
    playerId: player.id,
    rtrId: player.rtrId,
    fullName: player.fullName,
    nickname: player.nickname,
    picture: pictures[player.id] ?? null,
    playingStyle: migs
      ? 'Doubles, mostly at the front. I like fast drives and net kills, and I am working on my clears.'
      : '',
    experienceYears: migs ? 4 : null,
    experienceMonths: migs ? 6 : null,
    socialLinks: {
      facebook: migs
        ? 'https://facebook.com/migs.santos.badminton'
        : jomar
          ? 'https://facebook.com/jomar.dc'
          : '',
      instagram: migs ? 'https://instagram.com/migs.smash' : '',
      youtube: '',
      linkedin: '',
    },
  }
})
