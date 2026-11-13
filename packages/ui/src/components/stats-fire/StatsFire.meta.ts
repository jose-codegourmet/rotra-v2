import type { ComponentMeta } from '@rotra/ui/meta'

export const statsFireMeta = {
  name: 'StatsFire',
  description:
    'The pixel fire beside the win rate in Latest stats: an 18 × 22 canvas with the podium fire’s accent palette, from a 16 px ember at 1% to a 52 px flame at 100%, hotter as the rate rises; none at 0%.',
  usage: [
    'Use inside ProfileStatsSection only; it is decorative (aria-hidden), the number carries the meaning.',
    'Still (no animation) with reduced motion; the palette follows the theme.',
    'Under 420 px the stats box caps it at 40 px tall (className).',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'Profile card › Latest stats (ppFire, ppFireStep, ppFireDraw)',
  },
  docs: ['docs/mockup-changes/2026-11-13-profile-stats-redesign.md'],
  variants: ['low', 'middle', 'high', '100%', '0% (nothing)'],
  related: ['ProfileStatsSection', 'PixelFire'],
} satisfies ComponentMeta
