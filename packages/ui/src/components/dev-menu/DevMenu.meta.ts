import type { ComponentMeta } from '@rotra/ui/meta'
export const devMenuMeta = {
  name: 'DevMenu',
  description:
    'Prototype controls with Queue sync, recovery, download and authorization scenarios, plus Player Information rank/leaderboard and account previews, and an Admin-only scenario section.',
  usage: [
    'Mount only in development or with the explicit developer-menu build flag.',
    'Player link previews stay disabled until their callbacks are supplied. Account/private flows are not implemented by this component.',
  ],
  prototype: { file: 'docs/frames/queue-app/rotra-queue.html', screen: 'Prototype controls' },
  variants: [
    'admin',
    'default',
    'offline',
    'expired',
    'save-failure',
    'conflict',
    'player-scenarios',
  ],
  related: ['Sheet', 'Switch', 'SegmentedControl'],
  docs: ['docs/frames/player-app/rotra-player.html'],
} satisfies ComponentMeta
