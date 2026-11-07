import type { ComponentMeta } from '@rotra/ui/meta'
export const paymentStatusChipMeta = {
  name: 'PaymentStatusChip',
  description:
    "A player's payment status from the amount received against today's amount due: Paid, Partial (₱X left), Reimburse (₱X to return) or Unpaid.",
  usage: [
    'Pass the status from the payments data (paymentStatus in @rotra/data/session-payment/rules); never compute it in the component.',
    'Reimburse only tracks money to return; ROTRA moves no money.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'paymentsPanel › .pay-card .chip; SHEETS.payAmount',
  },
  docs: ['docs/screens/product/modules/queue/financials-inventory.md'],
  variants: ['paid', 'partial', 'reimburse', 'unpaid'],
  related: ['PaymentCard', 'PaymentAmountForm', 'Chip'],
} satisfies ComponentMeta
