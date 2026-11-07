import type { ComponentMeta } from '@rotra/ui/meta'
export const paymentsPanelMeta = {
  name: 'PaymentsPanel',
  description:
    'Wires optimistic payment marks, totals, filters and profiles to PaymentsChecklist; saves one batch after 800 ms and flushes on exit or Mark all paid. A card body tap opens "Payment from <name>" (PaymentAmountForm, #479), which flushes pending switches before saving the amount received.',
  usage: ['Preparation Payments tab, console Payments sheet, and valid session records.'],
  docs: ['docs/screens/product/modules/queue/financials-inventory.md'],
} satisfies ComponentMeta
