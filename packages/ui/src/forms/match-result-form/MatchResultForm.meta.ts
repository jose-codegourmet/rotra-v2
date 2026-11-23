import type { ComponentMeta } from '@rotra/ui/meta'

export const matchResultFormMeta = {
  name: 'MatchResultForm',
  description:
    'The "Match N result" sheet (Q-MATCH-DONE), following the session\'s scoring mode. One game (16/31, 16/31 no deuce, 11/21): Pick the winner (required), then the winner\'s fixed score beside one losing-score box, and in the deuce modes a Went to deuce switch for two boxes; Clear score. Best of 3 (11/21 × 3, 21 × 3): Pick the winner, OR, Enter each game (Game 3 only after a split) with a Team A / Team B pick, the fixed winning score and the losing box per row (11/21 × 3: a Deuce toggle per row), the games won and the winner above the rows; Clear scores. Back and the primary Review result.',
  usage: [
    "Open it from Match done on the active match sheet. Pass the match number, each team's short names in lineup order and the session's scoring (ScoringKey from @rotra/schema/scoring; missing reads as 16/31).",
    'onSubmit receives { winningTeam, teamAScore, teamBScore, games } after validation. One game: the score (null when none, never 0–0), games null. Best of 3: games is every game played (Team A first) and teamAScore / teamBScore the games won; all null for a winner-only result. The container then opens ConfirmResultSheet (D-WINNER) and owns the useCompleteMatch mutation; this form never saves.',
    'Back to result: matchResultInputOf(values, scoring) from ./default-values gives the fields back (a deuce score reopens with the switch on).',
    'Validation is the mode\'s rule from @rotra/schema/scoring (gameScoreError, validateResult) with the mockup log\'s copy: "Pick the winner.", "Enter the losing score as a whole number from 0 to 29.", "At 30–30 the game goes to deuce. Turn on Went to deuce and type both scores.", "A deuce game ends when one pair leads by 2, like 32–30.", "The score says Team B won, but Team A is picked. Fix one of them.", "The games say Team A won, but Team B is picked. Fix one of them.", "Enter a score for every game played, or clear them all.", "Pick who won each game. One pair must win 2 games to decide the match." (best-of-3 rows prefixed "Game 2: "). One line shows in place of the hint; the sheet stays open.',
    'In best of 3 the top pick follows the games once one pair has won 2; picking the other team by hand is refused on Review result.',
    'Pass isPending while the confirmation runs so Review result cannot fire twice, and serverError when the result could not be taken further; what was typed stays.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen:
      'SHEETS.result (entry step) · scoreEntry() · resultCheck() · ACT.reviewResult / resDeuce / resGameWin / clearScores',
  },
  docs: [
    'docs/mockup-changes/2026-11-18-queue-scoring-modes.md',
    'docs/screens/product/modules/queue/match-control.md',
    'docs/business_logic/product/queue/modules/matches/README.md',
  ],
  related: [
    'ConfirmResultSheet',
    'InvalidMatchSheet',
    'ChoiceGroup',
    'SegmentedControl',
    'Switch',
    'Field',
    'TextInput',
    'Sheet',
  ],
} satisfies ComponentMeta
