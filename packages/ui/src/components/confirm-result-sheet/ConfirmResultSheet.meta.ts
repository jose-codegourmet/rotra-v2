import type { ComponentMeta } from '@rotra/ui/meta'

export const confirmResultSheetMeta = {
  name: 'ConfirmResultSheet',
  description:
    'D-WINNER, the "Confirm match result" review: the Winner card (names, opponents, "21–17 (Team A–Team B)" or "No score entered", court(s)), the permanent-result warning, Back to result and "Confirm Team A wins".',
  usage: [
    'Open it with the values MatchResultForm reported from Review result; onBack reopens that form with what was entered.',
    'onConfirm fires once per attempt: pass isPending from useCompleteMatch and error when it fails. Save durably before the court frees; the container shows the "Team A wins match N · Court X free" toast.',
    'The primary always names the winning team; never a neutral Save. After confirmation there is no Undo, Change score, Add score later or Admin correction.',
    'courtLabels with two courts (5v5) switches the copy to "Both courts will become available."',
  ],
  prototype: {
    file: 'docs/frames/queue-app/rotra-queue.html',
    screen: 'SHEETS.result (review step) · ACT.confirmResult',
  },
  docs: [
    'docs/screens/product/dialogs.md',
    'docs/screens/product/modules/queue/match-control.md',
    'docs/business_logic/product/queue/modules/matches/README.md',
  ],
  related: ['ConfirmSheet', 'MatchResultForm', 'InvalidMatchSheet', 'Card', 'Notice'],
} satisfies ComponentMeta
