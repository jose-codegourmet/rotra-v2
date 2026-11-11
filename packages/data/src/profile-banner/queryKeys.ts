export const profileBannerKeys = {
  all: ['profile-banner'] as const,
  /** The Player picker: shown banners only */
  shown: ['profile-banner', 'shown'] as const,
  /** Admin: the whole library, hidden banners included */
  list: ['profile-banner', 'list'] as const,
}
