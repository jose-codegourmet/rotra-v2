import type { PlayerProfile } from '@rotra/data/player/types'
import { personalDetailsDefaultValues } from '@rotra/ui/personal-details-fields/default-values'
import type { YourDetailsValues } from './YourDetailsForm.schema'

export const yourDetailsDefaultValues: YourDetailsValues = {
  gender: '',
  ...personalDetailsDefaultValues,
}

/** The saved profile as the form's starting values (gender not added yet becomes ''). */
export function yourDetailsFromProfile(profile: PlayerProfile): YourDetailsValues {
  return {
    gender: profile.gender ?? '',
    fullName: profile.fullName,
    nickname: profile.nickname ?? '',
    playingStyle: profile.playingStyle,
    experienceYears: profile.experienceYears === null ? '' : String(profile.experienceYears),
    experienceMonths: profile.experienceMonths === null ? '' : String(profile.experienceMonths),
    ...profile.socialLinks,
  }
}
