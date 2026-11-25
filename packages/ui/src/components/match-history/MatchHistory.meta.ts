import type { ComponentMeta } from '@rotra/ui/meta'
export const matchHistoryMeta = {
  name: 'MatchHistory',
  description:
    'Official read-only player game history: Singles and doubles · Fun, partial and not ranked tabs, sessions newest first, three per page, each game a small court.',
  usage: [
    '`onOpenGame` (game id) makes every court open its match page.',
    'The second tab holds every game that is not `counted`: fun, partial, and games of a not ranked session (Record games off, D-2026-11-20-02). Empty: “No fun, partial or not-ranked games.”',
    'Three sessions per page with a Newer · Page N of M · K sessions · Older pager; pass `page` and `onPageChange` and reset to 1 on a tab change, a filter or another player.',
    'Pass `gameFilter` from the Weekly performance bar filter; it applies to the Singles and doubles tab.',
    'Own history: pass `publication` and the share handlers. Share performance and Share games show on every session; Share result only once the club has published (D-2026-11-13-06).',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'Games (viewHistory, sessionBlock, shareRow)',
  },
  docs: [
    'docs/mockup-changes/2026-11-25-player-match-page.md',
    'docs/screens/product/modules/player-information/ranking-history.md',
    'docs/mockup-changes/2026-11-13-player-game-row-court.md',
    'docs/mockup-changes/2026-11-20-player-not-ranked-games.md',
  ],
  related: ['GameRow', 'SessionGames', 'WeeklyPerformanceChart', 'Pager'],
} satisfies ComponentMeta
