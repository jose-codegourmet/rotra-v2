import type { ComponentMeta } from '@rotra/ui/meta'

export const paymentStatusShareSheetMeta = {
  name: 'PaymentStatusShareSheet',
  description:
    'Share payment status dialog: All / Paid / Partial / Unpaid filter, a read-only text preview of numbered lists with amounts paid, balances and collected totals, and Copy / Share.',
  usage: [
    'The text comes from buildPaymentShare (@rotra/data/session-payment/share-rules); this component only shows it.',
    'Pass onShare only where navigator.share exists; Copy text always shows.',
    'Used by the Queue app Payments panel and the public session page (owner decision 2026-11-22, #1015).',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'SHEETS.payShare › Share payment status',
  },
  docs: ['docs/mockup-changes/2026-11-22-queue-payment-status-share.md'],
  related: ['PaymentsChecklist', 'Sheet', 'SegmentedControl'],
} satisfies ComponentMeta
