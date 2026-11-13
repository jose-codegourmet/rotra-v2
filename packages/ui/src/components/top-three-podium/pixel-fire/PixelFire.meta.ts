import type { ComponentMeta } from '@rotra/ui/meta'

export const pixelFireMeta = {
  name: 'PixelFire',
  description: 'The theme-aware pixel fire behind first place on the Player Information podium.',
  usage: ['Behind first place in TopThreePodium and behind the MVP face in AwardCard.'],
  prototype: { file: 'apps/mockup/player-app/rotra-player.html', screen: 'podium() › #fire' },
  related: ['TopThreePodium'],
} satisfies ComponentMeta
