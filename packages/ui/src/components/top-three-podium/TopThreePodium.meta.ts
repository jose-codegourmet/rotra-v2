import type { ComponentMeta } from '@rotra/ui/meta'

export const topThreePodiumMeta = {
  name: 'TopThreePodium',
  description: 'A pixel-styled stage for the first three entries in the overall ROTRA leaderboard.',
  usage: ['Use above the leaderboard list when at least three players qualify.'],
  prototype: {
    file: 'docs/frames/player-app/rotra-player.html',
    screen: 'P-LEADERBOARD › podium()',
  },
  related: ['PixelFire', 'LeaderboardRow'],
} satisfies ComponentMeta
