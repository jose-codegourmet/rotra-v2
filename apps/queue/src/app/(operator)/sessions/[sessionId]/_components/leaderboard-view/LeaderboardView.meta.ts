import type { ComponentMeta } from '@rotra/ui/meta'

export const leaderboardViewMeta = {
  name: 'LeaderboardView',
  description:
    "Q-LEADERBOARD container, the console's Leaderboard view: LiveLeaderboard on useLiveStandings (computeStandings: most wins, then fewest losses; players with the same wins and losses share one position, grouped with groupStandings), each player's level from useSessionRoster and the minimum games from useQueueSession.",
  usage: [
    "Listed in SessionConsole's VIEWS registry under the Leaderboard tab; the standings query refreshes with every confirmed result and presence change, so the rows and games update without local state.",
    "Every face, also inside a shared position, reports the roster player's clubPlayerId through onOpenProfile (the shell's PlayerProfile); onOpenQueue is accepted but unused here.",
    'LiveLeaderboard shows its own empty state ("No completed games yet. Standings appear after the first confirmed result.") when no counted game exists.',
    "SessionPodium sits between the copy and the table (D-2026-11-25-04), on the same standings: a one-player place opens onOpenProfile; a shared place opens Podium place, whose rows open this view's own PlayerProfile with Back to place returning to the dialog. No period tabs: this session only.",
    'A session with Record games off shows the NotRankedNotice above the table; the rows are the same.',
    'Shows a heading-sized and table-sized Skeleton while the session, roster or standings load and a QueryError when one fails.',
  ],
  docs: [
    'docs/screens/product/modules/queue/session-console.md#q-leaderboard--tonights-standings',
    'docs/business_logic/product/queue/modules/results/README.md#live-leaderboard',
  ],
  related: ['SessionConsole', 'LiveLeaderboard', 'SessionPodium', 'PlayerProfile', 'PlayersView'],
} satisfies ComponentMeta
