import type { ComponentMeta } from '@rotra/ui/meta'

export const liveLeaderboardMeta = {
  name: 'LiveLeaderboard',
  description:
    "Tonight's standings on the console's Leaderboard view: rank with the top three highlighted, player picture, name and level, W, L, games against the session minimum and win %. A working view for the Queue Master, not official history.",
  usage: [
    'Pass the rows from useLiveStandings as they come: they are already sorted by most wins, then fewest losses, then head-to-head, and only players with at least one counted game are included. The row index is the rank.',
    'Partial (substituted) and invalid games are left out by the standings rules, never here. Official results exist only after a valid Session done.',
    "The player's picture opens their profile through onOpenProfile. At 760 px and below the table becomes one labelled card per row.",
    'Shows the empty card when there are no rows: "No completed games yet. Standings appear after the first confirmed result."',
    'variant "record" is the official standings table on a session record\'s Results tab (Q-HISTORY): #, Player (picture button named "NAME. View profile"), W, L, Games, top three highlighted, no heading, level or win %. Its empty card reads "No counted games were recorded in this session." The container renders the "Standings" heading with Result slides and Download images.',
  ],
  prototype: {
    file: 'docs/frames/queue-app/rotra-queue.html',
    screen:
      'Q-LEADERBOARD › boardPane() (.lb, .lb-wrap, .rank); record: Q-HISTORY › histResultsPane() (table.lb)',
  },
  docs: [
    'docs/screens/product/modules/queue/session-console.md#q-leaderboard--tonights-standings',
    'docs/business_logic/product/queue/modules/results/README.md#live-leaderboard',
    'docs/screens/product/modules/queue/results-sharing.md#q-history--session-record',
    'docs/business_logic/product/queue/modules/results/README.md#session-standings',
  ],
  variants: ['live', 'record'],
  related: [
    'DataTable',
    'Avatar',
    'LevelPill',
    'ConsoleFooterBar',
    'TopThreePodium',
    'RecordPlayerCard',
    'SessionRecordHeader',
  ],
} satisfies ComponentMeta
