import type { ComponentMeta } from '@rotra/ui/meta'

export const vsCardMeta = {
  name: 'VsCard',
  description: 'The Game page’s two teams, score, and controls for picking whose stats to show.',
  usage: [
    'Pass the teams, winner and score in the order shown on the court, and pass null as winner for partial games.',
    'Each player needs a unique button id and the name as the viewer may see it. The skill group shows as a ring and in the button’s accessible name.',
    'Use picked and the pick callbacks to control the selected rows and which stats cards open below.',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'Game page (viewMatch, vsP, vsTeam)',
  },
  docs: [
    'docs/screens/product/modules/player-information/match-page.md',
    'docs/mockup-changes/2026-11-26-player-match-court-vs-card.md',
  ],
  related: ['MatchPage', 'MatchCourt', 'PlayerStatsCard'],
} satisfies ComponentMeta
