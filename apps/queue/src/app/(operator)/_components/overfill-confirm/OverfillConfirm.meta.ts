import type { ComponentMeta } from '@rotra/ui/meta'

export const overfillConfirmMeta = {
  name: 'OverfillConfirm',
  description:
    'D-OVERFILL (#735): ConfirmSheet asking once before the Queue Master adds past a full roster, with the count and how expected games change (expectedGames() in @rotra/data, now and for one more).',
  usage: [
    'Open it from AddPlayer (Add player, Add late player) and from Give slot anyway on the waitlist when the roster count is at or over the slot budget.',
    'Pass onAddToWaitlist only for the Add player flows; Give slot anyway has Cancel and Add anyway.',
    'Cancel returns to the Add player sheet with the choice kept (the sheet stays open underneath).',
  ],
  prototype: { file: 'apps/mockup/queue-app/rotra-queue.html', screen: 'SHEETS.overfill' },
  docs: [
    'docs/screens/product/dialogs.md#d-overfill--add-a-player-to-a-full-roster',
    'docs/business_logic/product/queue/modules/players/README.md#slots-and-waitlist',
  ],
  related: ['ConfirmSheet', 'AddPlayer', 'PreparationRoster', 'PlayersView'],
} satisfies ComponentMeta
