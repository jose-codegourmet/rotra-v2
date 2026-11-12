import type { ComponentMeta } from '@rotra/ui/meta'

export const profileHeroMeta = {
  name: 'ProfileHero',
  description:
    'The top of the Player profile card: a 5:2 Profile banner edge to edge with nothing on it but the banner pencil on your own, then the 88 px circular picture (pencil on your own) with the name and nickname beside it. Nothing overlaps the banner (#765).',
  usage: [
    'placement="card" (default): first child of the profile card (PlayerIdentityCard); the Card needs pt-0 and overflow-hidden so the banner runs from the top edge.',
    'placement="preview": Edit profile › Name, under the section intro; the name is bold text, not a heading, and updates as the player types.',
    'bannerKey picks one of the six predefined banners (missing or unknown = Court); bannerImageUrl shows an Admin-uploaded banner and wins.',
    'onViewPicture makes a real picture the Avatar view button (“View full photo of NAME”) that opens PhotoViewer (#716); initials never open anything.',
    'onChangePicture adds the pencil (“Change profile picture”); leave it out on someone else’s profile.',
    'onChangeBanner adds the banner pencil (“Change banner”) in the banner’s top-right corner, inset 10 px; it opens BannerSheet. Own profile and Edit profile preview only; the one control allowed on the banner.',
    'Do not use for the Queue participant profile sheet; that is ProfileBannerCard.',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen:
      'Player profile (own and public) › profile card (.card.hero); Edit profile › Name (.edit-hero); .hero-top, .bn-cam',
  },
  docs: [
    'docs/mockup-changes/2026-11-11-player-profile-banner.md',
    'docs/mockup-changes/2026-11-12-player-profile-banner-layout-dialog.md',
    'docs/screens/product/modules/player-information/profile.md',
  ],
  variants: ['card', 'preview'],
  related: [
    'ProfileBanner',
    'BannerSheet',
    'PlayerIdentityCard',
    'EditProfileForm',
    'ProfileBannerCard',
  ],
} satisfies ComponentMeta
