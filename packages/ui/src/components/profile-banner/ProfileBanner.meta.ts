import type { ComponentMeta } from '@rotra/ui/meta'

export const profileBannerMeta = {
  name: 'ProfileBanner',
  description:
    'The art of a Profile banner: one of the six predefined banners (Court, Night, Dusk, Ember, Sun, Stripe) drawn from theme tokens, or an uploaded image from the Admin banner library.',
  usage: [
    'Pass bannerKey for a predefined banner; unknown or missing keys draw Court (the default). Pass imageUrl for an uploaded banner; it wins over bannerKey.',
    'Decorative and unsized: the parent gives it a height or an aspect ratio (ProfileHero 5:2 banner, BannerSheet 5:2 tile, Admin 5:2 tile).',
    'Also exports PROFILE_BANNERS, DEFAULT_PROFILE_BANNER, profileBannerKey, profileBannerName and profileBannerClass.',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'Player profile › profile card banner (.hero-banner, .bn-*)',
  },
  docs: [
    'docs/mockup-changes/2026-11-11-player-profile-banner.md',
    'docs/mockup-changes/2026-11-11-admin-profile-banners.md',
  ],
  variants: ['court', 'night', 'dusk', 'ember', 'sun', 'stripe', 'image'],
  related: ['ProfileHero', 'BannerSheet', 'ProfileBannersPage'],
} satisfies ComponentMeta
