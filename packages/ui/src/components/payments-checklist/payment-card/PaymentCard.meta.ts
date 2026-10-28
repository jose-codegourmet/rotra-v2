import type { ComponentMeta } from '@rotra/ui/meta'
export const paymentCardMeta = {
  name: 'PaymentCard',
  description: 'Manual paid marks for session roster players, with no contact details.',
  usage: ['Use in preparation, console Payments and the session record Financials tab.'],
  prototype: {
    file: 'docs/frames/queue-app/rotra-queue.html',
    screen: 'paymentsPanel › .pay-grid / .pay-card',
  },
  docs: ['docs/screens/product/modules/queue/financials-inventory.md'],
  variants: ['paid', 'unpaid'],
} satisfies ComponentMeta
