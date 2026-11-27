import type { ComponentMeta } from '@rotra/ui/meta'
export const paymentCardMeta = {
  name: 'PaymentCard',
  description: 'Manual paid marks for session roster players, with no contact details.',
  usage: [
    'Use in preparation, console Payments and the session record Financials tab.',
    'The switch is the quick paid toggle; the card body is its own button that opens the "Payment from <name>" amount editor (#479), so the two never conflict.',
    'A free player (D-2026-11-27-01, player.free) has a dashed card, a Free chip, "Not counted in the split" and no switch; the body still opens the amount editor, where Plays free switches off.',
    'A slot that came by transfer (#1013, player.transfer) is locked: the switch is disabled and the body opens the Slot history (onOpenHistory) with the cash carried and the waiver.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'paymentsPanel › .pay-grid / .pay-card',
  },
  docs: ['docs/screens/product/modules/queue/financials-inventory.md'],
  variants: ['paid', 'partial', 'reimburse', 'unpaid', 'no-fee', 'via-transfer', 'free'],
} satisfies ComponentMeta
