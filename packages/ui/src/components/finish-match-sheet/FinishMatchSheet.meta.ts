import type { ComponentMeta } from '@rotra/ui/meta'

export const finishMatchSheetMeta = {
  name: 'FinishMatchSheet',
  description:
    'The no-result variant of the Match done sheet, for a session with Record games off: "Finish match N?", the two teams and the line that no result is entered. Cancel and the primary "Match done".',
  usage: [
    'Open it from Match done instead of the MatchResultForm sheet when the session has Record games off; it asks for no winner and no score.',
    'onConfirm ends the match with no result; the game still counts toward each player\'s games and the court becomes available. Pass isPending and error from the commit.',
    'A recorded session keeps MatchResultForm then ConfirmResultSheet.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'SHEETS.result › !recordedOf(s) branch · ACT.confirmUnrecorded',
  },
  docs: [
    'docs/business_logic/product/queue/modules/sessions/README.md#record-games',
    'docs/mockup-changes/2026-11-18-queue-record-games-option.md',
  ],
  related: ['ConfirmSheet', 'ConfirmResultSheet', 'MatchResultForm', 'KeyValueList'],
} satisfies ComponentMeta
