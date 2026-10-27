import type { ComponentMeta } from '@rotra/ui/meta'

export const playerNavMeta = {
  name: 'PlayerNav',
  description:
    'The Player Information top-bar navigation for the overall leaderboard and either sign-in or the registered player\'s profile.',
  usage: [
    'Place beside the Player Information brand in the top bar.',
    'Pass href targets with linkAs={Link}, or navigation callbacks when the host owns navigation.',
  ],
  prototype: { file: 'docs/frames/player-app/rotra-player.html', screen: 'topBar() › .nav' },
  docs: ['docs/screens/product/navigation.md#product-navigation'],
  variants: ['signed-out', 'signed-in'],
  related: ['TopBar', 'OfflineBand'],
} satisfies ComponentMeta
