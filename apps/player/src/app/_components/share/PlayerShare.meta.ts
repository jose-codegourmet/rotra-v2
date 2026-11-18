import type { ComponentMeta } from '@rotra/ui/meta'
export const playerShareMeta = {
  name: 'PlayerShare',
  description:
    'Wires profile shares, owner-only rank shares and session shares to the shared image exporter. Player profile and rank images include the Top annual place when available.',
  usage: ['Use on own profile and games.'],
  prototype: { file: 'apps/mockup/player-app/rotra-player.html', screen: 'Share sheet' },
} satisfies ComponentMeta
