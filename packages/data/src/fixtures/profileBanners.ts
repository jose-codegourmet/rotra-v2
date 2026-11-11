import type { ProfileBanner } from '../profile-banner/profileBanner.types'

/** The six seeded banners (the `profile_banners` seed rows), all shown, in upload order. */
export const profileBanners: ProfileBanner[] = [
  'court',
  'night',
  'dusk',
  'ember',
  'sun',
  'stripe',
].map((id, index) => ({
  id,
  image: '',
  shown: true,
  uploadedAt: Date.UTC(2026, 10, 11) + index,
  number: index + 1,
}))
