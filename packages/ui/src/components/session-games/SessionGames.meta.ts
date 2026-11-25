import type { ComponentMeta } from '@rotra/ui/meta'
export const sessionGamesMeta = {
  name: 'SessionGames',
  description: 'Official read-only player game history.',
  usage: [
    '`onOpenGame` (game id) makes every court open its match page.',
    'Display official records without result editing controls.',
    'A session with `ranked: false` (Record games off, D-2026-11-20-02) shows a Not ranked chip after the club.',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'Games and Profile › Recent games',
  },
  docs: [
    'docs/mockup-changes/2026-11-25-player-match-page.md',
    'docs/screens/product/modules/player-information/ranking-history.md',
  ],
} satisfies ComponentMeta
