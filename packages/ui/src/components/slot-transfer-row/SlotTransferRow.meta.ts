import type { ComponentMeta } from '@rotra/ui/meta'
export const slotTransferRowMeta = {
  name: 'SlotTransferRow',
  description:
    "A pending slot transfer in Requests: the sender, the recipient's name and RTR ID, whether they are on the waitlist, their level here, and Reject / Approve.",
  usage: [
    'Pass the formatted request time, the suggested level (waitlist or saved level) and callbacks; the caller owns the approve and reject mutations.',
    'Approve needs a level: with none chosen the select shows the error and nothing is sent.',
    'Listed before Start only, after the drop-out notices; Start expires pending transfers.',
    'Pass viaLink for a claimed transfer link (#1012): “Shared a transfer link” and “Claimed by NAME”. An unclaimed link is never listed.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Requests › Slot transfers › transferRow()',
  },
  docs: [
    'docs/screens/product/modules/queue/session-setup.md',
    'docs/business_logic/product/queue/modules/players/README.md',
  ],
  related: ['Avatar', 'Chip', 'LevelSelect', 'Button', 'JoinRequestsPanel', 'DropOutNoticeRow'],
} satisfies ComponentMeta
