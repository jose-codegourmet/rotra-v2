import type { ComponentMeta } from '@rotra/ui/meta'
export const slotTransferHistoryMeta = {
  name: 'SlotTransferHistory',
  description:
    'The chain of approved slot transfers behind a Payments card: original payer, each giver and recipient, cash paid, waivers and approval times.',
  usage: [
    'Open it from a Payments card whose slot came by transfer (PaymentCard with transfer); put it in a Sheet titled “Slot history · NAME”.',
    'Pass the read’s transfer (waivedMinor + steps, oldest first), the slot’s cash (paid.amount) and status. Waivers are never cash.',
    'Read-only: transfers and their payment snapshots are append-only (#1013).',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Payments › transferred card › slotHistory sheet',
  },
  docs: [
    'docs/screens/product/modules/queue/financials-inventory.md',
    'docs/business_logic/product/queue/modules/financials/README.md',
  ],
  related: ['PaymentCard', 'PaymentStatusChip', 'Notice', 'Sheet'],
} satisfies ComponentMeta
