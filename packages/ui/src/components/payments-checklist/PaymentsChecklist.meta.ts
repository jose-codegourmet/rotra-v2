import type { ComponentMeta } from '@rotra/ui/meta'
export const paymentsChecklistMeta = {
  name: 'PaymentsChecklist',
  description: 'Manual paid marks for session roster players, with no contact details.',
  usage: ['Use in preparation, console Payments and the session record Financials tab.'],
  prototype: {
    file: 'app/mocksups-app/queue-app/rotra-queue.html',
    screen: 'paymentsPanel › .pay-grid / .pay-card',
  },
  docs: ['docs/screens/product/modules/queue/financials-inventory.md'],
  variants: ['default', 'all-paid', 'none-paid', 'no-fee', 'empty', 'as-sheet'],
} satisfies ComponentMeta
