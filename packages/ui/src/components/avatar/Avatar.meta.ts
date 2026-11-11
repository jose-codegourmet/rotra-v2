import type { ComponentMeta } from '@rotra/ui/meta'

export const avatarMeta = {
  name: 'Avatar',
  description:
    "A player picture, or the player's initials when there is no picture. On operator screens it can open the player's profile; with a picture it can open the full photo.",
  usage: [
    'Missing or failed images show initials; a new source or identity resets the failure and frozen frame.',
    'Resolve stored character references with profilePictureSrc from @rotra/ui/profile-picture before passing src.',
    'Reduced-motion displays a frozen canvas snapshot of the loaded photo, preserving the stored animation.',
    'Pass onClick on operator screens (queue cards, match dialogs, roster, payments, leaderboard): it becomes a button named "View <name>\'s profile". Never on public pages.',
    'Pass onView (D-PHOTO-VIEWER, #716) wherever the avatar is not already a profile button and the viewer may see the picture: a loaded picture (photo or character) becomes a button named "View full photo of <name>" (viewLabel overrides) with a zoom-in cursor and an accent focus ring; it calls onView, which opens PhotoViewer. Initials and failed images stay inert.',
    'onClick wins over onView: an avatar that opens a profile keeps opening it, and the photo opens from the big picture inside the profile. Never pass onView to an avatar inside another button or link (row, tile, PlayerFaceButton).',
    'Pick the size the prototype uses at that spot (24, 28, 36, 40, 44, 52, 64, 88).',
    'shape="square" tone="accent" is the club logo / big initials tile (.avatar.lg, .avatar.xxl).',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Shared styles › .avatar (.lg, .xl, .xxl, .photo); queue cards, match dialogs',
  },
  docs: ['docs/screens/product/experience-contract.md#layout-and-device-behavior'],
  variants: [
    '24',
    '28',
    '36',
    '40',
    '44',
    '52',
    '64',
    '88',
    'circle',
    'square',
    'neutral',
    'accent',
  ],
  related: ['ListRow', 'Chip', 'PhotoViewer'],
} satisfies ComponentMeta
