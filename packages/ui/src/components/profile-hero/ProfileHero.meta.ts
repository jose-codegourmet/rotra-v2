import type { ComponentMeta } from '@rotra/ui/meta'

export const profileHeroMeta = {
  name: 'ProfileHero',
  description:
    'The top of the Player profile card: a Profile banner strip edge to edge, the 88 px circular picture overlapping its bottom edge with a surface ring (pencil button on your own), and the name and nickname beside it.',
  usage: [
    'placement="card" (default): first child of the profile card (PlayerIdentityCard); the Card needs pt-0 and overflow-hidden so the strip runs from the top edge.',
    'placement="preview": Edit profile › Name, under the section intro; the name is bold text, not a heading, and updates as the player types.',
    'bannerKey picks one of the six predefined banners (missing or unknown = Court); bannerImageUrl shows an Admin-uploaded banner and wins.',
    'onChangePicture adds the pencil (“Change profile picture”); leave it out on someone else’s profile.',
    'Do not use for the Queue participant profile sheet; that is ProfileBannerCard.',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen:
      'Player profile (own and public) › profile card (.card.hero); Edit profile › Name (.edit-hero)',
  },
  docs: [
    'docs/mockup-changes/2026-11-11-player-profile-banner.md',
    'docs/screens/product/modules/player-information/profile.md',
  ],
  variants: ['card', 'preview'],
  related: ['ProfileBanner', 'PlayerIdentityCard', 'EditProfileForm', 'ProfileBannerCard'],
} satisfies ComponentMeta
