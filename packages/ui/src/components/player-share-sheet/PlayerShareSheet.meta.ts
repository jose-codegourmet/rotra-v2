import type { ComponentMeta } from '@rotra/ui/meta'
export const playerShareSheetMeta = {
  name: 'PlayerShareSheet',
  description: 'PlayerShareSheet for Player Information.',
  usage: ['Use on the matching Player Information screen.'],
  prototype: { file: 'apps/mockup/player-app/rotra-player.html', screen: 'Share sheet' },
  variants: ['Open'],
} satisfies ComponentMeta
