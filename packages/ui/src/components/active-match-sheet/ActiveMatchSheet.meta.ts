import type { ComponentMeta } from '@rotra/ui/meta'

export const activeMatchSheetMeta = {
  name: 'ActiveMatchSheet',
  description:
    'Q-ACTIVE-MATCH: the in-game control sheet for a match on court. "Match N · Court X", format with start time and minutes in, both teams with levels, one line per substitution ("Neither gets credit" or "NAME got the game (QM choice)"), the hint "Drag a player onto someone in the other pair to swap partners. Tap a player\'s card to bring in someone from outside (substitute or replace), or their picture to see their profile." (a card tap opens PlayerActionSheet), and Mark invalid and Match done.',
  usage: [
    'Open it from an occupied court on the live console or from an active queue card. The container passes the match, its court label ("Court 1 + Court 2" for 5v5) and each player\'s counted games.',
    'The three footer actions only open the next sheet (Q-INVALID-MATCH, Q-SUBSTITUTE, Q-MATCH-DONE); nothing here changes the match. Closing the sheet never ends the game or frees the court.',
    'Move to a free court sits under the substitutions (as in the prototype) and calls onMoveToFree, which opens MoveMatchSheet with variant "playing". Pass freeCourtCount; it is disabled with "No court is free" when fewer courts are free than the match needs (two for a 5v5). Omit onMoveToFree to hide it.',
    'Pass scoringLabel (SCORING[key].label) to end the format line with “· Scoring · 11/21 × 3”; omitted reads as 16/31.',
    'Never add level edits, past-result changes, a reset shortcut, point-by-point scoring or an umpire control.',
    'Pass onOpenProfile (the picture) and onSelectPlayer (the card). Pass onSwapPartners(aId, bId) to let a player be dragged onto someone in the other pair (or ← / →) to swap partners; the owner changes the pairs and nothing is recorded as a substitution. Omit it to turn the drag off.',
    'Pre-start lineups use the Start match sheet, where sides can still be switched.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Q-ACTIVE-MATCH › SHEETS.match',
  },
  docs: [
    'docs/screens/product/modules/queue/match-control.md',
    'docs/business_logic/product/queue/modules/matches/README.md',
  ],
  related: ['TeamLineup', 'MatchPlayerCard', 'SubstitutionSheet', 'ConfirmSheet', 'Sheet'],
} satisfies ComponentMeta
