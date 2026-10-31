import type { ComponentMeta } from '@rotra/ui/meta'

export const avatarMeta = {
  name: 'Avatar',
  description:
    "A player picture, or the player's initials when there is no picture. On operator screens it can open the player's profile.",
  usage: [
    'Pass onClick on operator screens (queue cards, match dialogs, roster, payments, leaderboard): it becomes a button named "View <name>\'s profile". Never on public pages.',
    'Pick the size the prototype uses at that spot (24, 28, 36, 40, 44, 52, 64, 88).',
    'shape="square" tone="accent" is the club logo / big initials tile (.avatar.lg, .avatar.xxl).',
  ],
  prototype: {
    file: 'app/mocksups-app/queue-app/rotra-queue.html',
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
  related: ['ListRow', 'Chip'],
} satisfies ComponentMeta
