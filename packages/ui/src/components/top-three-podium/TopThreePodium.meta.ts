import type { ComponentMeta } from '@rotra/ui/meta'

export const topThreePodiumMeta = {
  name: 'TopThreePodium',
  description:
    'The prototype’s grid-lit, pixel-notched stage with avatar artwork, rising fire and reduced-motion support for the first three entries in the overall ROTRA leaderboard.',
  usage: [
    'Player pictures are circles, on screen and in any downloaded image (D-2026-11-11-11).',
    'Supports visitor privacy states for Player Information.',
    'Use above the leaderboard list when at least three players qualify.',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'P-LEADERBOARD › podium()',
  },
  related: ['PixelFire', 'LeaderboardRow'],
} satisfies ComponentMeta
