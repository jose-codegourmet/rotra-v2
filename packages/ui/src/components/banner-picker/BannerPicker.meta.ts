import type { ComponentMeta } from '@rotra/ui/meta'

export const bannerPickerMeta = {
  name: 'BannerPicker',
  description:
    'Edit profile › Name › Banner: the Profile banners players may pick, as swatches in a radio group, the current one outlined, with the line “Selected: NAME · Public. Pick one of ROTRA’s banners; your own images can’t be uploaded.”',
  usage: [
    'onChange fires once per new pick and applies at once (no Save changes); the container saves it and shows the toast “Banner updated”.',
    'options are the banners shown in Admin › Profile banners; leave it out for the six predefined ones (Court, Night, Dusk, Ember, Sun, Stripe). A missing value means Court.',
    'No upload and no remove: players only pick.',
    'Arrow keys move between swatches (Radix RadioGroup).',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'Edit profile › Name › Banner (.banner-pick, .banner-opt)',
  },
  docs: [
    'docs/mockup-changes/2026-11-11-player-profile-banner.md',
    'docs/screens/product/modules/player-information/profile.md',
  ],
  related: ['ProfileBanner', 'ProfileHero', 'EditProfileForm'],
} satisfies ComponentMeta
