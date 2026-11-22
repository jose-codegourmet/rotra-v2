import type { ComponentMeta } from '@rotra/ui/meta'
export const refundListMeta = {
  name: 'RefundList',
  description:
    'Refund everyone who paid on a cancelled session record (#1014): each paid or partially paid player with the whole cash to hand back outside ROTRA, and Record refund.',
  usage: [
    'Place it on the cancelled record after Open public page, before the roster; hide it when refundList() returns no rows.',
    'Build rows with refundList() from @rotra/data/session-payment/refund-rules: cash received before any refund, the slot’s waiver (never refunded) and the refund recorded.',
    'onRecord opens RefundConfirmSheet (variant session). One refund per player, append-only: a recorded row shows “Refunded ₱X · WHEN”.',
    'Disable Record refund offline (online only).',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'History › cancelled record › refundCard()',
  },
  docs: [
    'docs/screens/product/modules/queue/results-sharing.md',
    'docs/business_logic/product/queue/modules/financials/README.md',
  ],
  related: ['RefundConfirmSheet', 'CancelledRecordRoster', 'SessionRecordHeader', 'Card'],
} satisfies ComponentMeta
