import type { ComponentMeta } from '@rotra/ui/meta'

export const topThreePodiumMeta = {
  name: 'TopThreePodium',
  description: 'The prototype’s grid-lit, pixel-notched stage with avatar artwork, rising fire and reduced-motion support for the first three entries in the overall ROTRA leaderboard.',
  usage: ['Use above the leaderboard list when at least three players qualify.'],
  prototype: {
    file: 'docs/frames/player-app/rotra-player.html',
    screen: 'P-LEADERBOARD › podium()',
  },
  related: ['PixelFire', 'LeaderboardRow'],
} satisfies ComponentMeta
