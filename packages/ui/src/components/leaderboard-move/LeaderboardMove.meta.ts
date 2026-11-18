import type { ComponentMeta } from '@rotra/ui/meta'

export const leaderboardMoveMeta = {
  name: 'LeaderboardMove',
  description:
    'The mark beside a leaderboard place, with the earlier place shown on hover and focus.',
  usage: ['Pass the previous place, or null when the player was absent from the earlier list.'],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'P-LEADERBOARD › lbMove',
  },
  docs: ['docs/screens/product/modules/player-information/ranking-history.md'],
  variants: ['up', 'down', 'same', 'new'],
  related: ['LeaderboardRow', 'MyPositionCard'],
} satisfies ComponentMeta
