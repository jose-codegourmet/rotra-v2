import type { ComponentMeta } from '@rotra/ui/meta'

export const paymentAmountFormMeta = {
  name: 'PaymentAmountForm',
  description:
    "Q-PAYMENTS (#479): record the amount received from one player, full or partial. Shows the amount due, Full ₱X and Clear shortcuts, and a live Paid / Partial / Reimburse / Unpaid preview against today's amount due.",
  usage: [
    'Render it as the body of the "Payment from <name>" sheet, opened by tapping a Payments card body (not its switch). The Cancel and Save buttons are part of it; put it in a Sheet without a footer.',
    'Pass defaultValues from paymentAmountInputFrom(received, amountDue) and previewStatus from statusForReceived (@rotra/data/session-payment/rules).',
    'The container flushes pending payment switches before saving, owns the mutation, the toast and closing the sheet. 0 saves as not paid.',
    'While isPending, Save reads "Saving…" and nothing can be pressed; serverError shows above the buttons and the typed amount stays.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'SHEETS.payAmount',
  },
  docs: [
    'docs/screens/product/modules/queue/financials-inventory.md#q-payments--payments-checklist',
    'docs/business_logic/product/queue/modules/financials/README.md#payments-checklist',
  ],
  variants: ['paid', 'partial', 'reimburse', 'no fee', 'pending', 'server error'],
  related: ['PaymentCard', 'PaymentStatusChip', 'Sheet'],
} satisfies ComponentMeta
