import type { ComponentMeta } from '@rotra/ui/meta'
export const devMenuMeta = {
  name: 'DevMenu',
  description:
    'Presentational prototype controls for offline, license expiry, save failure, conflict and Player rank/leaderboard scenarios.',
  usage: ['Mount only in development or with the explicit developer-menu build flag.'],
  prototype: { file: 'docs/frames/queue-app/rotra-queue.html', screen: 'Prototype controls' },
  variants: ['default', 'offline', 'expired', 'save-failure', 'conflict', 'player-scenarios'],
  related: ['Sheet', 'Switch'],
} satisfies ComponentMeta
