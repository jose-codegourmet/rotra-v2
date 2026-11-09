import type { ComponentMeta } from '@rotra/ui/meta'
export const playerShareMeta = {
  name: 'PlayerShare',
  description: 'Wires owner-only rank and published session shares to the shared image exporter.',
  usage: ['Use on own profile and games.'],
  prototype: { file: 'apps/mockup/player-app/rotra-player.html', screen: 'Share sheet' },
} satisfies ComponentMeta
