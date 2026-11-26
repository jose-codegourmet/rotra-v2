import type { ComponentMeta } from '@rotra/ui/meta'

export const matchPageMeta = {
  name: 'MatchPage',
  description:
    'The public Game page: a court over its Session card beside both teams, with a stats card for each picked player.',
  usage: [
    'Pass the useMatchPage result as page: undefined while loading, null for Game not found, and error with onRetry when the read failed.',
    'A viewer who played sees their side on the left and “You” for their name. Other visitors see Team A on the left.',
    'Use onOpenPlayer for the profile card from the court or a player’s stats. Use onShareGame for the signed-in player’s own games and onOpenGame for earlier-game courts.',
    'Send the back label and handler for the page the court was tapped on. Use Leaderboard when the player opens a direct link.',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'Game page (viewMatch, /player/matches/<id>)',
  },
  docs: [
    'docs/screens/product/modules/player-information/match-page.md',
    'docs/mockup-changes/2026-11-25-player-match-page.md',
    'docs/mockup-changes/2026-11-26-player-match-court-vs-card.md',
  ],
  related: ['GameRow', 'MatchCourt', 'VsCard', 'PlayerStatsCard'],
} satisfies ComponentMeta
