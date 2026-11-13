import type { ComponentMeta } from '@rotra/ui/meta'
export const sessionStandingsMeta = {
  name: 'SessionStandings',
  description:
    'The finished session page’s Leaderboard tab: Your position (picture, #N of M, W, L, games, Share), Share leaderboard, the standings table with faces and the order rule.',
  usage: [
    'Show it only when the club has shared the Standings; the Leaderboard tab does not exist before.',
    'The Your position card scrolls to the viewer’s row and flashes it (no flash with reduced motion); its Share opens the system share sheet.',
    'A signed-in viewer without a counted game sees “You didn’t play a counted game in this session.”; visitors get no card.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Public session page › Leaderboard (pubLeaderboard, .lb-*)',
  },
  docs: [
    'docs/mockup-changes/2026-11-13-queue-finished-session-page.md',
    'docs/mockup-changes/2026-11-13-share-leaderboard.md',
  ],
  related: ['LeaderboardShareCard', 'StandingsSlide'],
} satisfies ComponentMeta
