import type { ComponentMeta } from '@rotra/ui/meta'

export const profilePictureSheetMeta = {
  name: 'ProfilePictureSheet',
  description:
    'Frame a local photo draft, or choose initials or a character; Done commits the picture.',
  usage: [
    'The container owns picture updates and toasts; Done persists independently of Edit profile Save; dismissal discards the local draft.',
    'Use profileCharacterUrl from @rotra/ui/profile-picture to display a selected character elsewhere.',
    'preparePhoto decodes HEIC locally; crop controls never upload. onCommit persists only on Done.',
    'Saving disables dismissal and further choices; failure keeps the editable draft.',
  ],
  prototype: { file: 'apps/mockup/player-app/rotra-player.html', screen: 'Profile picture sheet' },
  docs: ['docs/screens/product/modules/player-information/profile.md'],
  variants: ['photo', 'initials', 'character', 'pending', 'crop', 'error'],
  related: ['Avatar', 'Sheet', 'PlayerIdentityCard', 'EditProfileForm'],
} satisfies ComponentMeta
