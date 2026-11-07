import type { ComponentMeta } from '@rotra/ui/meta'
export const paymentCardMeta = {
  name: 'PaymentCard',
  description: 'Manual paid marks for session roster players, with no contact details.',
  usage: [
    'Use in preparation, console Payments and the session record Financials tab.',
    'The switch is the quick paid toggle; the card body is its own button that opens the "Payment from <name>" amount editor (#479), so the two never conflict.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'paymentsPanel › .pay-grid / .pay-card',
  },
  docs: ['docs/screens/product/modules/queue/financials-inventory.md'],
  variants: ['paid', 'partial', 'reimburse', 'unpaid', 'no-fee'],
} satisfies ComponentMeta
