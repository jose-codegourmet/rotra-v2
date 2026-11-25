import type { ComponentMeta } from '@rotra/ui/meta'
export const sessionStandingsMeta = {
  name: 'SessionStandings',
  description:
    'The finished session page’s Leaderboard tab: Your position (picture, #N of M · tied with 2 others, W, L, games, Share), Share leaderboard, the standings table (one row per position, stacked faces when players share it) and the order rule.',
  usage: [
    "podium: the session's TopThreePodium (D-2026-11-25-04), rendered between the players count with Share leaderboard and the table.",
    'Rows are { id, position, players, wins, losses, games }: one row per position. Players with the same wins and losses share a row (1, 1, 2); the caller computes positions (Q23.4) and orders the players inside a position. games is a number or {min, max} shown “5–6”.',
    'A shared position stacks its faces (the first on top) over every name; each face opens its own profile through the player’s onOpen. Flag the viewer with `isViewer` on their player: the row holding them is tinted, their name reads “NAME (you)” and Your position shows “of N · tied with 2 others” (N counts players, not rows).',
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
  related: ['LeaderboardShareCard', 'StandingsSlide', 'StandingsFaces', 'Avatar'],
} satisfies ComponentMeta
