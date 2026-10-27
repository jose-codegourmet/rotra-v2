import type { ComponentMeta } from '@rotra/ui/meta'

export const leaderboardViewMeta = {
  name: 'LeaderboardView',
  description:
    'Q-LEADERBOARD container, the console\'s Leaderboard view: LiveLeaderboard on useLiveStandings (computeStandings: most wins, then fewest losses, then head-to-head), each row\'s level from useSessionRoster and the minimum games from useQueueSession.',
  usage: [
    'Listed in SessionConsole\'s VIEWS registry under the Leaderboard tab; the standings query refreshes with every confirmed result and presence change, so the rows and games update without local state.',
    'Player pictures report the roster player\'s clubPlayerId through onOpenProfile (the shell\'s PlayerProfile); onOpenQueue is accepted but unused here.',
    'LiveLeaderboard shows its own empty state ("No completed games yet. Standings appear after the first confirmed result.") when no counted game exists.',
    'Shows a heading-sized and table-sized Skeleton while the session, roster or standings load and a QueryError when one fails.',
  ],
  docs: [
    'docs/screens/product/modules/queue/session-console.md#q-leaderboard--tonights-standings',
    'docs/business_logic/product/queue/modules/results/README.md#live-leaderboard',
  ],
  related: ['SessionConsole', 'LiveLeaderboard', 'PlayerProfile', 'PlayersView'],
} satisfies ComponentMeta
