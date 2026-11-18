import type { ComponentMeta } from '@rotra/ui/meta'

export const topThreePodiumMeta = {
  name: 'TopThreePodium',
  description:
    'The selected list’s first three players and their wins on the pixel-notched stage, captioned with the period.',
  usage: [
    'Use above the list when at least three players are listed.',
    'Pass a formatted date for the selected period.',
    'Pass disabled on tiles that cannot open a profile for the current viewer.',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'P-LEADERBOARD › podium()',
  },
  docs: ['docs/screens/product/modules/player-information/ranking-history.md'],
  related: ['PixelFire', 'LeaderboardRow'],
} satisfies ComponentMeta
