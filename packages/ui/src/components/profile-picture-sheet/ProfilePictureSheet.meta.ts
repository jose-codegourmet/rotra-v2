import type { ComponentMeta } from '@rotra/ui/meta'

export const profilePictureSheetMeta = {
  name: 'ProfilePictureSheet',
  description:
    'Frame a local photo draft, or choose initials or a character; Done commits the picture.',
  usage: [
    'Player pictures are circles, on screen and in any downloaded image (D-2026-11-11-11).',
    'The container owns picture updates and toasts; Done persists independently of Edit profile Save; dismissal discards the local draft.',
    'Use profilePictureSrc from @rotra/ui/profile-picture to display a saved picture elsewhere.',
    'preparePhoto decodes HEIC locally; crop controls never upload. onCommit persists only on Done.',
    'Pass ordered character images and previousPhoto; onCommitDraft receives the draft and previous photo only on Done.',
    'Characters are picked through CharacterPicker: 5 round per row, 15 per page.',
    'Saving disables dismissal and further choices; failure keeps the editable draft.',
  ],
  prototype: { file: 'apps/mockup/player-app/rotra-player.html', screen: 'Profile picture sheet' },
  docs: ['docs/screens/product/modules/player-information/profile.md'],
  variants: [
    'photo',
    'initials',
    'character',
    'pending',
    'crop',
    'error',
    'previous photo',
    'paged characters',
  ],
  related: ['CharacterPicker', 'Avatar', 'Pager', 'Sheet', 'PlayerIdentityCard', 'EditProfileForm'],
} satisfies ComponentMeta
