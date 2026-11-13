import type { ComponentMeta } from '@rotra/ui/meta'

export const profileHeroMeta = {
  name: 'ProfileHero',
  description:
    'The top of the Player profile card, the same top as the profile dialog (2026-11-13-player-profile-hero-like-card): the top half of the Profile banner as a 5:1 strip, the 88 px picture with a surface ring centred on its bottom edge, then the display name (nickname first) with the full name under it. Edit profile keeps the 5:2 preview.',
  usage: [
    'placement="card" (default): first child of the profile card (PlayerIdentityCard); the Card needs pt-0 and overflow-hidden so the banner runs from the top edge. The heading is the nickname, else the full name; with a nickname the full name follows in muted text.',
    'placement="preview": Edit profile › Name, under the section intro (unchanged: 5:2 banner, picture beside the name, nickname in quotes); the name is bold text, not a heading, and updates as the player types.',
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
    'docs/mockup-changes/2026-11-13-player-profile-hero-like-card.md',
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
