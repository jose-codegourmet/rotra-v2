import type { ComponentMeta } from '@rotra/ui/meta'

export const bannerSheetMeta = {
  name: 'BannerSheet',
  description:
    'The Profile banner dialog: the banners players may pick as 5:2 tiles (2 across on phones, 3 from 640 px), the draft outlined, with the line “Public. Pick one of ROTRA’s banners; your own images can’t be uploaded.” and Cancel / Done.',
  usage: [
    'Same behaviour as ProfilePictureSheet: a local draft; Done commits through onCommit; Cancel, ×, Escape or the scrim discard it. Done is disabled until the pick changes.',
    'Opened by the banner pencil on ProfileHero (own profile and the Edit profile preview). The container saves with useSetMyProfileBanner and toasts “Banner updated”.',
    'options are the banners shown in Admin › Profile banners; leave it out for the six predefined ones (Court, Night, Dusk, Ember, Sun, Stripe). A missing value means Court.',
    'isPending shows Saving… and blocks dismissal; a failed save keeps the draft and shows the error.',
    'No upload and no remove: players only pick. Arrow keys move between tiles (Radix RadioGroup).',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'Profile banner sheet (SHEETS.banner, .banner-pick, .banner-opt)',
  },
  docs: [
    'docs/mockup-changes/2026-11-12-player-profile-banner-layout-dialog.md',
    'docs/screens/product/modules/player-information/profile.md',
  ],
  variants: ['default', 'changed', 'pending', 'disabled', 'error', 'uploaded banners'],
  related: ['ProfileBanner', 'ProfileHero', 'ProfilePictureSheet', 'Sheet', 'EditProfileForm'],
} satisfies ComponentMeta
