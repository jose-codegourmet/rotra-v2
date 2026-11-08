import type { ComponentMeta } from '@rotra/ui/meta'

export const profilePictureSheetMeta = {
  name: 'ProfilePictureSheet',
  description: 'Choose a photo, initials or one of eight characters for a player profile.',
  usage: [
    'The container owns picture updates and toasts; choices apply independently of Edit profile Save.',
    'Use profileCharacterUrl to display a selected character elsewhere.',
  ],
  prototype: { file: 'apps/mockup/player-app/rotra-player.html', screen: 'Profile picture sheet' },
  docs: ['docs/screens/product/modules/player-information/profile.md'],
  variants: ['photo', 'initials', 'character'],
  related: ['Avatar', 'Sheet', 'PlayerIdentityCard', 'EditProfileForm'],
} satisfies ComponentMeta
