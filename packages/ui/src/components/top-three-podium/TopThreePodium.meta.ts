import type { ComponentMeta } from '@rotra/ui/meta'

export const topThreePodiumMeta = {
  name: 'TopThreePodium',
  description:
    'Places 1 to 3 of a leaderboard on the pixel-notched stage: one player, several players stacked on one step, or No one yet. Always shows its three steps.',
  usage: [
    'Use above every leaderboard (ROTRA, club, Queue session and Queue Leaderboards page), whenever the list has loaded, also when it is empty.',
    'Pass every player in places 1 to 3 as places; the list below starts at place 4.',
    'Pass the record line as each player’s stat ("7 wins", "3 W · 1 L"); a shared place adds " each".',
    'onOpenPlayer opens a one-player place; onOpenPlace opens PodiumPlaceDialog for a shared place. Omit both for a podium that opens nothing; set canOpen false on a profile the viewer may not open.',
    'Leaderboards never mask names or pictures (D-2026-11-25-04).',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'P-LEADERBOARD › podium() (also rotra-queue.html podiumHtml)',
  },
  docs: [
    'docs/screens/product/modules/player-information/ranking-history.md',
    'docs/screens/product/modules/queue/leaderboards.md',
  ],
  variants: ['single', 'stacked', 'empty'],
  related: ['PixelFire', 'PodiumPlaceDialog', 'LeaderboardList', 'LeaderboardPeriodSwitch'],
} satisfies ComponentMeta
