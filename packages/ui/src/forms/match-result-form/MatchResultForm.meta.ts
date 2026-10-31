import type { ComponentMeta } from '@rotra/ui/meta'

export const matchResultFormMeta = {
  name: 'MatchResultForm',
  description:
    'The "Match N result" sheet (Q-MATCH-DONE): pick the winner with two Team A / Team B cards, or enter the final score as two whole numbers; Clear scores once a score is typed; Back and the primary Review result.',
  usage: [
    "Open it from Match done on the active match sheet. Pass the match number and each team's short names in lineup order.",
    'onSubmit receives { winningTeam, teamAScore, teamBScore } after validation (a valid score sets the winner; blank scores are null, never 0–0). The container then opens ConfirmResultSheet (D-WINNER) and owns the useCompleteMatch mutation; this form never saves.',
    'Validation copy is fixed: "Pick a winner or enter the final score.", "Enter both scores as whole numbers, or clear them.", "A tie can’t decide a winner. Correct the score, or clear it and pick a winner.", "The score says Team B won, but Team A is picked. Fix one of them." It shows one line in place of the hint.',
    'Pass isPending while the confirmation runs so Review result cannot fire twice, and serverError when the result could not be taken further; what was typed stays.',
    'No fixed target such as 21, no sets or deuce, no draw workflow.',
  ],
  prototype: {
    file: 'app/mocksups-app/queue-app/rotra-queue.html',
    screen: 'SHEETS.result (entry step) · ACT.reviewResult / clearScores',
  },
  docs: [
    'docs/screens/product/modules/queue/match-control.md',
    'docs/business_logic/product/queue/modules/matches/README.md',
  ],
  related: [
    'ConfirmResultSheet',
    'InvalidMatchSheet',
    'ChoiceGroup',
    'Field',
    'TextInput',
    'Sheet',
  ],
} satisfies ComponentMeta
