import type { ClubPlayerDetails } from '@rotra/data/club-player/types'
import type { EditPlayerDetailsValues } from './EditPlayerDetailsForm.schema'

/** The form's starting values from what the club already entered. */
export function editPlayerDetailsDefaultValues(details: ClubPlayerDetails): EditPlayerDetailsValues {
  const profile = details.profile
  return {
    fullName: details.fullName,
    nickname: details.nickname ?? '',
    phone: '',
    email: profile?.email ?? '',
    playingStyle: profile?.playingStyle ?? '',
    experienceYears: profile?.experienceYears == null ? '' : String(profile.experienceYears),
    experienceMonths: profile?.experienceMonths == null ? '' : String(profile.experienceMonths),
    facebook: profile?.socialLinks.facebook ?? '',
    instagram: profile?.socialLinks.instagram ?? '',
    youtube: profile?.socialLinks.youtube ?? '',
    linkedin: profile?.socialLinks.linkedin ?? '',
  }
}
