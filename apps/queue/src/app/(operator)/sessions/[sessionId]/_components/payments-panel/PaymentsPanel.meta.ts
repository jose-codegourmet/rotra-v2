import type { ComponentMeta } from '@rotra/ui/meta'
export const paymentsPanelMeta = {
  name: 'PaymentsPanel',
  description:
    'Wires optimistic payment marks, totals, filters and profiles to PaymentsChecklist; saves one batch after 800 ms and flushes on exit or Mark all paid.',
  usage: ['Preparation Payments tab, console Payments sheet, and valid session records.'],
  docs: ['docs/screens/product/modules/queue/financials-inventory.md'],
} satisfies ComponentMeta
