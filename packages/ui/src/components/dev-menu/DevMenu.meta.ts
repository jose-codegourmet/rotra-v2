import type { ComponentMeta } from '@rotra/ui/meta'
export const devMenuMeta = {
  name: 'DevMenu',
  description:
    'Prototype controls with a Player Information section layout, segmented rank/leaderboard states, account status and Admin settings.',
  usage: [
    'Mount only in development or with the explicit developer-menu build flag.',
    'Player link previews stay disabled until their callbacks are supplied. Account/private flows are not implemented by this component.',
  ],
  prototype: { file: 'docs/frames/queue-app/rotra-queue.html', screen: 'Prototype controls' },
  variants: ['default', 'offline', 'expired', 'save-failure', 'conflict', 'player-scenarios'],
  related: ['Sheet', 'Switch', 'SegmentedControl'],
  docs: ['docs/frames/player-app/rotra-player.html'],
} satisfies ComponentMeta
