import type { ComponentMeta } from '@rotra/ui/meta'

export const activeMatchSheetMeta = {
  name: 'ActiveMatchSheet',
  description:
    'Q-ACTIVE-MATCH: the in-game control sheet for a match on court. "Match N · Court X", format with start time and minutes in, both teams with levels, one line per substitution, and Mark invalid, Substitute player and Match done.',
  usage: [
    'Open it from an occupied court on the live console or from an active queue card. The container passes the match, its court label ("Court 1 + Court 2" for 5v5) and each player\'s counted games.',
    'The three footer actions only open the next sheet (Q-INVALID-MATCH, Q-SUBSTITUTE, Q-MATCH-DONE); nothing here changes the match. Closing the sheet never ends the game or frees the court.',
    'Never add level edits, past-result changes, a reset shortcut, point-by-point scoring or an umpire control.',
    'Pre-start lineups use the Start match sheet, where sides can still be switched.',
  ],
  prototype: {
    file: 'app/mocksups-app/queue-app/rotra-queue.html',
    screen: 'Q-ACTIVE-MATCH › SHEETS.match',
  },
  docs: [
    'docs/screens/product/modules/queue/match-control.md',
    'docs/business_logic/product/queue/modules/matches/README.md',
  ],
  related: ['TeamLineup', 'MatchPlayerCard', 'SubstitutionSheet', 'ConfirmSheet', 'Sheet'],
} satisfies ComponentMeta
