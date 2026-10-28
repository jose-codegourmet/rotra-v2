import type { ComponentMeta } from '@rotra/ui/meta'

export const sessionFinancialsSummaryMeta = {
  name: 'SessionFinancialsSummary',
  description: 'The saved session estimate on the Financials tab.',
  usage: ['Use on operator financial surfaces; amounts are integer centavos.'],
  prototype: {
    file: 'docs/frames/queue-app/rotra-queue.html',
    screen: 'Setup page 3 › Financials; Session record › Financials',
  },
  docs: ['docs/screens/product/modules/queue/financials-inventory.md'],
  variants: ['estimate', 'no-estimate'],
} satisfies ComponentMeta
