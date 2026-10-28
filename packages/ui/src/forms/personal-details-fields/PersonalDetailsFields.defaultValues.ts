import type { PlayerProfile } from '@rotra/data/player/types'
import type { PersonalDetailsValues } from './PersonalDetailsFields.schema'
export const personalDetailsDefaultValues: PersonalDetailsValues = {
  fullName: '',
  nickname: '',
  playingStyle: '',
  experienceYears: '',
  experienceMonths: '',
  facebook: '',
  instagram: '',
  youtube: '',
  linkedin: '',
}
/** A saved public profile as form text; null experience becomes an empty field. */
export function personalDetailsFromProfile(profile: PlayerProfile): PersonalDetailsValues {
  return {
    fullName: profile.fullName,
    nickname: profile.nickname ?? '',
    playingStyle: profile.playingStyle,
    experienceYears: profile.experienceYears === null ? '' : String(profile.experienceYears),
    experienceMonths: profile.experienceMonths === null ? '' : String(profile.experienceMonths),
    ...profile.socialLinks,
  }
}
