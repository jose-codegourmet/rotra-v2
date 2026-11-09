import type { ComponentMeta } from '@rotra/ui/meta'

export const confirmMakeMatchSheetMeta = {
  name: 'ConfirmMakeMatchSheet',
  description:
    'D-MAKE-MATCH: confirm picked players on a court, with games and level labels and an optional arrangement notice.',
  usage: [
    'Pass teams in pick order and level totals; onArrange changes the teams in the caller. onConfirm adds the match and onCancel closes the sheet.',
    'Pass isPending during placement and error when placement fails.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Live console › Players › Make match › confirmMake()',
  },
  docs: ['docs/screens/product/dialogs.md#d-make-match--confirm-a-match-from-picked-players'],
  related: ['Sheet', 'CourtDrawing', 'Button', 'Notice'],
} satisfies ComponentMeta
