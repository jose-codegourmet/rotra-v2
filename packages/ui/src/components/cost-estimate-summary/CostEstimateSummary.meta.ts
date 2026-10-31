import type { ComponentMeta } from '@rotra/ui/meta'

export const costEstimateSummaryMeta = {
  name: 'CostEstimateSummary',
  description: 'The optional session cost estimate, payment per player and profit or loss.',
  usage: ['Use on operator financial surfaces; amounts are integer centavos.'],
  prototype: {
    file: 'app/mocksups-app/queue-app/rotra-queue.html',
    screen: 'Setup page 3 › Financials; Session record › Financials',
  },
  docs: ['docs/screens/product/modules/queue/financials-inventory.md'],
  variants: ['profit', 'loss', 'breaks-even', 'rounding-surplus', 'no-costs'],
} satisfies ComponentMeta
