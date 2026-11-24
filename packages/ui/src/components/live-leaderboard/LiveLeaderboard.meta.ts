import type { ComponentMeta } from '@rotra/ui/meta'

export const liveLeaderboardMeta = {
  name: 'LiveLeaderboard',
  description:
    "Tonight's standings on the console's Leaderboard view: position with the top three highlighted, player faces (stacked when players share a position), names and levels, W, L, games against the session minimum and win %. A working view for the Queue Master, not official history.",
  usage: [
    'Rows are { position, players, wins, losses, games }: one row per position, best first. Players with the same wins and losses share a row (positions 1, 1, 2) and their names follow the standings order. Compute positions upstream (Q23.4); this component never does. Only players with at least one counted game are included.',
    'A shared position stacks its faces (the first on top) over every name, joined by commas; the level line lists the distinct levels. Each face is its own profile button. W and L are the shared values; games is one number or {min, max} shown "5–6". The rank badge and top-three tint follow the position, so a position 3 shared by three players is tinted. Win % is wins over wins plus losses. Long names wrap inside the Player column and never push into W, L or Games.',
    "On the live variant every face has a 3 px ring in its player's level band (Beginner blue, Intermediate yellow, Advanced red, grey with no level), stacked faces included. The record variant has no rings.",
    'Partial (substituted) and invalid games are left out by the standings rules, never here. Official results exist only after a valid Session done.',
    "Each player's face opens their profile through onOpenProfile. At 760 px and below the table becomes one labelled card per row.",
    'Shows the empty card when there are no rows: "No completed games yet. Standings appear after the first confirmed result."',
    'variant "record" is the official standings table on a session record\'s Results tab (Q-HISTORY): #, Player (face buttons named "NAME. View profile"), W, L, Games, top three highlighted, no heading, level or win %. Its empty card reads "No counted games were recorded in this session." The container renders the "Standings" heading with Result slides and Download images.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
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
    'StandingsFaces',
    'LevelPill',
    'ConsoleFooterBar',
    'TopThreePodium',
    'RecordPlayerCard',
    'SessionRecordHeader',
  ],
} satisfies ComponentMeta
