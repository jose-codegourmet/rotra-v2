import type { ComponentMeta } from '@rotra/ui/meta'

export const pixelFireMeta = {
  name: 'PixelFire',
  description: 'The theme-aware pixel fire behind first place on the Player Information podium.',
  usage: ['Use only inside TopThreePodium.'],
  prototype: { file: 'docs/frames/player-app/rotra-player.html', screen: 'podium() › #fire' },
  related: ['TopThreePodium'],
} satisfies ComponentMeta
