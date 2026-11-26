import type { ComponentMeta } from '@rotra/ui/meta'

export const matchResultFormMeta = {
  name: 'MatchResultForm',
  description:
    'The "Match N result" sheet (Q-MATCH-DONE), following the session\'s scoring mode. Owner, November 25, 2026: two score boxes from the start, no deuce switch. Picking a team fills its box with the target (green, still editable, e.g. 32 for deuce) and picking the other team after a mistake trades the scores; typing the scores picks the winner. One game (16/31, 16/31 no deuce, 11/21): Pick the winner, Team A and Team B boxes, Clear score. Best of 3 (11/21 × 3, 21 × 3): Pick the winner, OR, Enter each game (Game 3 only after a split), each row a Team A / Team B pick and the same two boxes, the games won and the winner above the rows; Clear scores. Back and the primary Review result.',
  usage: [
    "Open it from Match done on the active match sheet. Pass the match number, each team's short names in lineup order and the session's scoring (ScoringKey from @rotra/schema/scoring; missing reads as 16/31).",
    'onSubmit receives { winningTeam, teamAScore, teamBScore, games } after validation. One game: the score (null when none, never 0–0), games null. Best of 3: games is every game played (Team A first) and teamAScore / teamBScore the games won; all null for a winner-only result. The container then opens ConfirmResultSheet (D-WINNER) and owns the useCompleteMatch mutation; this form never saves.',
    'Back to result: matchResultInputOf(values, scoring) from ./default-values gives both boxes back.',
    'Validation is the mode\'s rule (gameScoreValid, typedScoreError, validateResult from @rotra/schema/scoring) with the mockup log\'s copy: "Pick the winner.", "Enter both scores, or clear them.", "Scores are whole numbers.", "A game can\'t end level. One pair needs 31.", "The winner has 31 and the other pair 0 to 30." (no deuce), "At 30–30 the game goes to deuce: the winner needs a 2-point lead, like 32–30.", "Enter a finished game: 31 against 0 to 29, or past 30–30 a 2-point lead, like 32–30.", "The games say Team A won, but Team B is picked. Fix one of them.", "Enter a score for every game played, or clear them all.", "Pick who won each game. One pair must win 2 games to decide the match." (best-of-3 rows prefixed "Game 2: "). Only the winner\'s box filled is a winner-only result. One line shows in place of the hint; the sheet stays open.',
    'In best of 3 the top pick follows the games once one pair has won 2; picking the other team by hand is refused on Review result.',
    'Pass isPending while the confirmation runs so Review result cannot fire twice, and serverError when the result could not be taken further; what was typed stays.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen:
      'SHEETS.result (entry step) · scoreEntry() · syncScores() · pickScoreWinner() · resultCheck() · ACT.reviewResult / resWinner / resGameWin / clearScores',
  },
  docs: [
    'docs/mockup-changes/2026-11-18-queue-scoring-modes.md',
    'docs/mockup-changes/2026-11-25-queue-result-score-boxes.md',
    'docs/screens/product/modules/queue/match-control.md',
    'docs/business_logic/product/queue/modules/matches/README.md',
  ],
  related: [
    'ConfirmResultSheet',
    'InvalidMatchSheet',
    'ChoiceGroup',
    'SegmentedControl',
    'Field',
    'TextInput',
    'Sheet',
  ],
} satisfies ComponentMeta
